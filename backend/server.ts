import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import axios from 'axios';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Cache para farmácias
const cache = new Map<string, CleanPharmacy[]>();

// ====================
// TIPAGENS E INTERFACES
// ====================

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

// ====================
// AGENDAMENTO DE MEDICAÇÕES
// ====================

interface DoseHistory {
  date: string; // formato: YYYY-MM-DD
  time: string; // formato: HH:mm
  taken: boolean;
}

interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string; // ex: "500mg"
  type: string; // ex: "capsule", "tablet", "liquid"
  interval: number; // em horas (8, 12, 24, etc)
  startTime: string; // formato: HH:mm (horário da primeira dose)
  createdAt: string; // ISO timestamp
  active: boolean;
  doseHistory: DoseHistory[]; // histórico de doses
}

interface MedicationRequest {
  name: string;
  dosage: string;
  type: string;
  interval: number;
  startTime: string;
  userId: string;
}

// Arquivo de persistência (em memória, salvo em JSON)
const MEDICATIONS_FILE = path.join(__dirname, '../data', 'medications.json');

// Garantir que a pasta data existe
async function ensureDataDir() {
  try {
    await fs.mkdir(path.dirname(MEDICATIONS_FILE), { recursive: true });
  } catch (err) {
    // Pasta já existe
  }
}

// Carregar medicações do arquivo
let medications: Medication[] = [];

async function loadMedications() {
  try {
    const data = await fs.readFile(MEDICATIONS_FILE, 'utf-8');
    medications = JSON.parse(data);
    console.log(`✅ Carregadas ${medications.length} medicações do arquivo`);
  } catch (err) {
    console.log('📝 Nenhum arquivo de medicações encontrado, iniciando vazio');
    medications = [];
  }
}

// Salvar medicações no arquivo
async function saveMedications() {
  try {
    console.log('➡️ Salvando medicações em', MEDICATIONS_FILE);
    await ensureDataDir();
    await fs.writeFile(MEDICATIONS_FILE, JSON.stringify(medications, null, 2));
    console.log('✅ Medicações salvas com sucesso');
  } catch (err) {
    console.error('❌ Erro ao salvar medicações:', err);
  }
}

// Carregar dados na inicialização
loadMedications();

// ====================
// ENDPOINT DE SAÚDE
// ====================

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ====================
// ENDPOINT DE FARMÁCIAS
// ====================

app.get(
  '/api/farmacias',
  async (req: Request<{}, {}, {}, PharmacyQuery>, res: Response) => {
    const { lat, lng, keyword } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude e Longitude são obrigatórios.' });
    }

    // Arredondamos a coordenada para 2 casas decimais (aprox. 1km de área)
    const cacheKey = `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}_${keyword || ''}`;

    // VERIFICA O CACHE
    if (cache.has(cacheKey)) {
      console.log('Servindo do Cache! Super rápido ⚡');
      return res.json({ status: 'OK', results: cache.get(cacheKey) });
    }

    console.log('Buscando da API do Google... 🐢');
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: 'Chave da API não configurada no servidor.' });
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&type=pharmacy&keyword=${keyword || ''}&key=${GOOGLE_API_KEY}`;

    try {
      const googleResponse = await axios.get(url);

      console.log('STATUS GOOGLE:', googleResponse.data.status);
      console.log('FARMÁCIAS ENCONTRADAS:', googleResponse.data.results.length);

      const farmaciasLimpas: CleanPharmacy[] = googleResponse.data.results.map(
        (farmacia: GooglePlaceResult) => ({
          id: farmacia.place_id,
          name: farmacia.name,
          vicinity: farmacia.vicinity,
          latitude: farmacia.geometry.location.lat,
          longitude: farmacia.geometry.location.lng,
        })
      );

      // SALVA NO CACHE
      cache.set(cacheKey, farmaciasLimpas);

      // Limpar o cache dessa coordenada após 24 horas
      setTimeout(() => {
        console.log(`Limpando cache para a chave: ${cacheKey}`);
        cache.delete(cacheKey);
      }, 24 * 60 * 60 * 1000);

      res.json({ status: 'OK', results: farmaciasLimpas });
    } catch (error: any) {
      console.error('Erro ao buscar no Google:', error.message);
      res.status(500).json({ error: 'Erro interno ao buscar farmácias.' });
    }
  }
);

// ====================
// ENDPOINTS DE AGENDAMENTO
// ====================

// POST /api/agendamentos - Criar nova medicação
app.post('/api/agendamentos', async (req: Request<{}, {}, MedicationRequest>, res: Response) => {
  try {
    const { name, dosage, type, interval, startTime, userId } = req.body;

    // Validação
    if (!name || !dosage || !type || !interval || !startTime || !userId) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (![8, 12, 24].includes(interval)) {
      return res.status(400).json({ error: 'Intervalo deve ser 8, 12 ou 24 horas' });
    }

    const newMedication: Medication = {
      id: Date.now().toString(),
      userId,
      name,
      dosage,
      type,
      interval,
      startTime,
      createdAt: new Date().toISOString(),
      active: true,
      doseHistory: [],
    };

    medications.push(newMedication);
    await saveMedications();

    console.log(`✅ Medicação criada: ${name} para usuário ${userId}`);
    res.status(201).json(newMedication);
  } catch (error: any) {
    console.error('❌ Erro ao criar medicação:', error.message);
    res.status(500).json({ error: 'Erro ao criar medicação' });
  }
});

// GET /api/agendamentos/:userId - Listar medicações do usuário
app.get('/api/agendamentos/:userId', (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    const userMeds = medications.filter((m) => m.userId === userId);

    console.log(`📋 Retornando ${userMeds.length} medicações para usuário ${userId}`);
    if (userMeds.length === 0) {
      return res.status(404).json({ error: 'Nenhuma medicação encontrada para este usuário' });
    }
    res.json(userMeds);
  } catch (error: any) {
    console.error('❌ Erro ao listar medicações:', error.message);
    res.status(500).json({ error: 'Erro ao listar medicações' });
  }
});

// GET /api/agendamentos/:userId/proxima-dose - Próxima dose
app.get('/api/agendamentos/:userId/proxima-dose', (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    const userMeds = medications.filter((m) => m.userId === userId && m.active);

    if (userMeds.length === 0) {
      return res.json({ proximaDose: null, medicacoes: [] });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const proximasDoses = userMeds.map((med) => {
      const [startHour, startMinute] = med.startTime.split(':').map(Number);
      const startTimeInMinutes = startHour * 60 + startMinute;

      let nextDoseTime = startTimeInMinutes;
      let daysFromNow = 0;

      // Se a primeira dose já passou hoje, calcula a próxima baseado no intervalo
      if (startTimeInMinutes <= currentTimeInMinutes) {
        const hoursDifference = Math.floor((currentTimeInMinutes - startTimeInMinutes) / 60);
        const intervalsCompleted = Math.floor(hoursDifference / med.interval);
        const minutesUntilNext = (intervalsCompleted + 1) * med.interval * 60 - (currentTimeInMinutes - startTimeInMinutes);

        if (minutesUntilNext < 24 * 60) {
          nextDoseTime = currentTimeInMinutes + minutesUntilNext;
          if (nextDoseTime >= 24 * 60) {
            nextDoseTime -= 24 * 60;
            daysFromNow = 1;
          }
        } else {
          nextDoseTime = startTimeInMinutes;
          daysFromNow = 1;
        }
      }

      const nextHour = Math.floor(nextDoseTime / 60);
      const nextMinute = nextDoseTime % 60;

      return {
        medication: med,
        proximaDose: `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`,
        daysFromNow,
      };
    });

    // Ordenar por tempo mais próximo
    proximasDoses.sort((a, b) => {
      if (a.daysFromNow !== b.daysFromNow) return a.daysFromNow - b.daysFromNow;
      const timeA = parseInt(a.proximaDose.replace(':', ''));
      const timeB = parseInt(b.proximaDose.replace(':', ''));
      return timeA - timeB;
    });

    console.log(`🕐 Próxima dose em ${proximasDoses[0].proximaDose}`);
    res.json(proximasDoses[0] || null);
  } catch (error: any) {
    console.error('❌ Erro ao calcular próxima dose:', error.message);
    res.status(500).json({ error: 'Erro ao calcular próxima dose' });
  }
});

// GET /api/agendamentos/:userId/aderencia - Aderência
app.get('/api/agendamentos/:userId/aderencia', (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    const userMeds = medications.filter((m) => m.userId === userId);

    let totalTomadas = 0;
    let totalEsperado = 0;

    const seteDialsAtras = new Date();
    seteDialsAtras.setDate(seteDialsAtras.getDate() - 7);

    userMeds.forEach((med) => {
      const dosesEsperadasPorDia = 24 / med.interval;
      const diasAtivos = 7;
      totalEsperado += dosesEsperadasPorDia * diasAtivos;

      const dosasTomadas = med.doseHistory.filter((dose) => {
        const doseDate = new Date(dose.date);
        return doseDate >= seteDialsAtras && dose.taken;
      }).length;

      totalTomadas += dosasTomadas;
    });

    const aderencia = totalEsperado > 0 ? Math.round((totalTomadas / totalEsperado) * 100) : 0;

    console.log(`📊 Aderência do usuário ${userId}: ${aderencia}%`);
    res.json({ aderencia, total: totalEsperado, tomadas: totalTomadas });
  } catch (error: any) {
    console.error('❌ Erro ao calcular aderência:', error.message);
    res.status(500).json({ error: 'Erro ao calcular aderência' });
  }
});

// PUT /api/agendamentos/:id - Atualizar medicação
app.put('/api/agendamentos/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const medIndex = medications.findIndex((m) => m.id === id);

    if (medIndex === -1) {
      return res.status(404).json({ error: 'Medicação não encontrada' });
    }

    medications[medIndex] = { ...medications[medIndex], ...req.body };
    await saveMedications();

    console.log(`✅ Medicação ${id} atualizada`);
    res.json(medications[medIndex]);
  } catch (error: any) {
    console.error('❌ Erro ao atualizar medicação:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar medicação' });
  }
});

// DELETE /api/agendamentos/:id - Deletar medicação
app.delete('/api/agendamentos/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const medIndex = medications.findIndex((m) => m.id === id);

    if (medIndex === -1) {
      return res.status(404).json({ error: 'Medicação não encontrada' });
    }

    const removed = medications.splice(medIndex, 1);
    await saveMedications();

    console.log(`✅ Medicação ${id} deletada`);
    res.json({ message: 'Medicação deletada', medication: removed[0] });
  } catch (error: any) {
    console.error('❌ Erro ao deletar medicação:', error.message);
    res.status(500).json({ error: 'Erro ao deletar medicação' });
  }
});

// POST /api/agendamentos/:id/marcar-como-tomado - Registrar dose tomada
app.post(
  '/api/agendamentos/:id/marcar-como-tomado',
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      let { date, time } = req.body;

      const medIndex = medications.findIndex((m) => m.id === id);
      if (medIndex === -1) {
        return res.status(404).json({ error: 'Medicação não encontrada' });
      }

      // Se não especificou data/hora, usar agora
      if (!date || !time) {
        const now = new Date();
        date = now.toISOString().split('T')[0]; // YYYY-MM-DD
        time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // HH:mm
      }

      const doseRecord: DoseHistory = {
        date,
        time,
        taken: true,
      };

      medications[medIndex].doseHistory.push(doseRecord);
      await saveMedications();

      console.log(`✅ Dose registrada para ${medications[medIndex].name} em ${date} ${time}`);
      // Retornar a resposta compatível (dose + medicação) para compatibilidade
      res.status(201).json({ message: 'Dose registrada', dose: doseRecord, medication: medications[medIndex] });
    } catch (error: any) {
      console.error('❌ Erro ao registrar dose:', error.message);
      res.status(500).json({ error: 'Erro ao registrar dose' });
    }
  }
);

// ====================
// INICIAR SERVIDOR
// ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor NexDose rodando na porta ${PORT}`);
  console.log(`📝 Endpoints disponíveis:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/farmacias`);
  console.log(`   POST /api/agendamentos`);
  console.log(`   GET  /api/agendamentos/:userId`);
  console.log(`   GET  /api/agendamentos/:userId/proxima-dose`);
  console.log(`   GET  /api/agendamentos/:userId/aderencia`);
  console.log(`   PUT  /api/agendamentos/:id`);
  console.log(`   DELETE /api/agendamentos/:id`);
  console.log(`   POST /api/agendamentos/:id/marcar-como-tomado`);
});
