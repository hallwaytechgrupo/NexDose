import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import axios from 'axios';
import cors from 'cors';

dotenv.config(); 

const app = express();
app.use(cors());
app.use(express.json());

// Crie um "caderninho" de anotações para o cache
const cache = new Map<string, CleanPharmacy[]>();

// Tipagens
interface PharmacyQuery {
  lat?: string;
  lng?: string;
  keyword?: string;
}

interface GooglePlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: { lat: number; lng: number };
  };
}

interface CleanPharmacy {
  id: string;
  name: string;
  vicinity: string;
  latitude: number;
  longitude: number;
}

app.get(
  '/api/farmacias', 
  async (req: Request<{}, {}, {}, PharmacyQuery>, res: Response) => {
    const { lat, lng, keyword } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude e Longitude são obrigatórios.' });
    }

    // Arredondamos a coordenada para 2 casas decimais (aprox. 1km de área)
    const cacheKey = `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}_${keyword || ''}`;

    // 1. VERIFICA O CACHE: Se já buscamos essa área, devolve na hora!
    if (cache.has(cacheKey)) {
      console.log("Servindo do Cache! Super rápido ⚡");
      return res.json({ status: 'OK', results: cache.get(cacheKey) });
    }
    
    console.log("Buscando da API do Google... 🐢");
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: 'Chave da API não configurada no servidor.' });
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&type=pharmacy&keyword=${keyword || ''}&key=${GOOGLE_API_KEY}`;

    try {
      const googleResponse = await axios.get(url);

      console.log("STATUS GOOGLE:", googleResponse.data.status);
      console.log("FARMÁCIAS ENCONTRADAS:", googleResponse.data.results.length);
      
      const farmaciasLimpas: CleanPharmacy[] = googleResponse.data.results.map(
        (farmacia: GooglePlaceResult) => ({
          id: farmacia.place_id,
          name: farmacia.name,
          vicinity: farmacia.vicinity,
          latitude: farmacia.geometry.location.lat,
          longitude: farmacia.geometry.location.lng,
        })
      );

      // 2. SALVA NO CACHE: Guarda a resposta limpa para a próxima vez
      cache.set(cacheKey, farmaciasLimpas);

      // Opcional: Limpar o cache dessa coordenada após 24 horas
      setTimeout(() => {
        console.log(`Limpando cache para a chave: ${cacheKey}`);
        cache.delete(cacheKey);
      }, 24 * 60 * 60 * 1000); // 24 horas

      res.json({ status: 'OK', results: farmaciasLimpas });
    } catch (error: any) {
      console.error("Erro ao buscar no Google:", error.message);
      res.status(500).json({ error: 'Erro interno ao buscar farmácias.' });
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor TS rodando na porta ${PORT}`);
});