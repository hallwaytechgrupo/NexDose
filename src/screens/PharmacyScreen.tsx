import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TextInput } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { AppScreen } from '../components/Primitives';
import { colors } from '../theme/tokens';

// A interface agora reflete os dados LIMPOS que vêm do seu Backend
interface Pharmacy {
  id: string; 
  name: string;
  vicinity: string;
  latitude: number;
  longitude: number;
}

// Crie este pequeno componente fora da sua tela principal
const FastMarker = ({ pharmacy, pinColor }) => {
  const [trackChanges, setTrackChanges] = useState(true);

  return (
    <Marker
      coordinate={{
        latitude: Number(pharmacy.latitude),
        longitude: Number(pharmacy.longitude),
      }}
      title={pharmacy.name}
      description={pharmacy.vicinity}
      pinColor={pinColor}
      tracksViewChanges={trackChanges}
      // Assim que o mapa desenhar ele uma vez, ele "congela" e não trava mais o app
      onLoad={() => setTrackChanges(false)} 
    />
  );
};

export function PharmacyScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('farmácia');

  const searchNearbyPharmacies = async (lat: number, lon: number) => {
    // ATENÇÃO: Substitua '192.168.1.XX' pelo IP do seu computador na rede Wi-Fi
    // Se for Emulador Android, você pode usar '10.0.2.2'
    const BACKEND_URL = `http://192.168.15.13:3000/api/farmacias?lat=${lat}&lng=${lon}&keyword=${searchQuery}`;

    try {
      const response = await fetch(BACKEND_URL);
      const json = await response.json();
      
      if (json.status === 'OK' && json.results) {
        setPharmacies(json.results); // Atualiza o estado com as farmácias limpas
      } else {
        console.warn("Erro retornado pelo nosso backend:", json.error);
      }
    } catch (error) {
      console.error("Erro ao conectar com o servidor Node:", error);
      setErrorMsg("Erro ao buscar farmácias do servidor.");
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('A permissão para acessar a localização foi negada');
        return;
      }

      // Primeiro tentamos pegar o cache do GPS (Instantâneo)
      let location = await Location.getLastKnownPositionAsync({});

      // Se tiver a posição antiga, já desenha o mapa na hora!
      if (location) {
        setLocation(location);
        searchNearbyPharmacies(location.coords.latitude, location.coords.longitude);
      }

      // Depois, pede a posição exata com precisão menor (Mais rápido)
      // Accuracy.Balanced é muito mais rápido que Accuracy.Highest
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, 
      });

      setLocation(location);
      searchNearbyPharmacies(location.coords.latitude, location.coords.longitude);
    })();
  }, []);

  useEffect(() => {
    if (location) {
      searchNearbyPharmacies(location.coords.latitude, location.coords.longitude);
    }
  }, [location, searchQuery]);

  if (errorMsg) return <AppScreen><View style={styles.center}><Text>{errorMsg}</Text></View></AppScreen>;
  if (!location) return <AppScreen><View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text>Obtendo localização...</Text></View></AppScreen>;


  return (
    console.log("TOTAL DE FARMÁCIAS NO STATE:", pharmacies.length),
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
      >
        {pharmacies.map((pharmacy) => (
          <FastMarker key={pharmacy.id} pharmacy={pharmacy} pinColor={colors.primary} />
        ))}
      </MapView>
     
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    height: 48,
    fontSize: 16,
    color: colors.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
});
