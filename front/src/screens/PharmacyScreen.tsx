import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { AppScreen } from "../components/Primitives";
import { getApiBaseUrl } from "../services/api";
import { colors } from "../theme/tokens";

interface Pharmacy {
  id: string;
  name: string;
  vicinity: string;
  latitude: number;
  longitude: number;
}

interface PharmacyApiResponse {
  results?: Pharmacy[];
  error?: string;
  providerStatus?: string;
  providerMessage?: string;
}

const FastMarker = ({
                      pharmacy,
                      pinColor,
                    }: {
  pharmacy: Pharmacy;
  pinColor: string;
}) => {
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
          onLayout={() => setTrackChanges(false)}
      />
  );
};

export function PharmacyScreen() {
  // 1. ESTADOS DO CLIENTE (Mantidos! Pertencem ao aparelho local)
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery] = useState("farmacia");

  // Captura do GPS nativo do celular
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("A permissão para acessar a localização foi negada.");
        return;
      }

      let currentLocation = await Location.getLastKnownPositionAsync({});
      if (currentLocation) setLocation(currentLocation);

      currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
    })();
  }, []);

  // 2. A FERRARI: Substitui a função manual e o segundo useEffect
  const {
    data: pharmacies = [],
    isLoading: isFetchingPharmacies,
    isError,
    error,
  } = useQuery({
    queryKey: ['pharmacies', location?.coords.latitude, location?.coords.longitude, searchQuery],
    enabled: !!location, // A requisição só sai do celular se o GPS já tiver uma coordenada
    staleTime: 1000 * 60 * 5, // 5 MINUTOS DE CACHE ABSOLUTO (Economiza requisições ao Google)
    retry: 2, // Se a rede piscar na rua, tenta mais 2 vezes silenciosamente
    queryFn: async () => {
      const backendUrl = `${getApiBaseUrl()}/api/farmacias?lat=${location!.coords.latitude}&lng=${location!.coords.longitude}&keyword=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(backendUrl);
      const json = (await response.json().catch(() => null)) as PharmacyApiResponse | null;

      if (!response.ok) {
        const details = json?.providerMessage || json?.error;
        throw new Error(details || 'Falha na comunicação com o servidor de mapas');
      }

      return Array.isArray(json?.results) ? json.results : [];
    }
  });

  // 3. RENDERIZAÇÃO LIMPA E DIRETA
  if (locationError) {
    return (
        <AppScreen>
          <View style={styles.center}>
            <Text>{locationError}</Text>
          </View>
        </AppScreen>
    );
  }

  // Mostra carregamento só no início (procurando GPS ou fazendo o primeiro fetch do mapa)
  if (!location || isFetchingPharmacies) {
    return (
        <AppScreen>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text>{!location ? 'Obtendo GPS...' : 'Buscando farmácias...'}</Text>
          </View>
        </AppScreen>
    );
  }

  if (isError) {
    return (
        <AppScreen>
          <View style={styles.center}>
            <Text style={{ color: 'red', textAlign: 'center', padding: 20 }}>
              {error instanceof Error
                ? error.message
                : 'Você está offline ou nossos servidores estão indisponíveis no momento.'}
            </Text>
          </View>
        </AppScreen>
    );
  }

  return (
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
            showsUserLocation
        >
          {pharmacies.map((pharmacy) => (
              <FastMarker
                  key={pharmacy.id}
                  pharmacy={pharmacy}
                  pinColor={colors.primary}
              />
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
});
