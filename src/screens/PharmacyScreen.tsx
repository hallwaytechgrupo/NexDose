import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
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
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery] = useState("farmacia");

  const searchNearbyPharmacies = async (lat: number, lon: number) => {
    const backendUrl = `${getApiBaseUrl()}/api/farmacias?lat=${lat}&lng=${lon}&keyword=${encodeURIComponent(searchQuery)}`;

    try {
      const response = await fetch(backendUrl);
      const json = await response.json();

      if (json.status === "OK" && json.results) {
        setPharmacies(json.results);
      } else {
        console.warn("Erro retornado pelo backend:", json.error);
      }
    } catch (error) {
      console.error("Erro ao conectar com o servidor Node:", error);
      setErrorMsg("Erro ao buscar farmacias do servidor.");
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("A permissao para acessar a localizacao foi negada");
        return;
      }

      let currentLocation = await Location.getLastKnownPositionAsync({});

      if (currentLocation) {
        setLocation(currentLocation);
        searchNearbyPharmacies(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );
      }

      currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation(currentLocation);
      searchNearbyPharmacies(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );
    })();
  }, []);

  useEffect(() => {
    if (location) {
      searchNearbyPharmacies(location.coords.latitude, location.coords.longitude);
    }
  }, [location, searchQuery]);

  if (errorMsg) {
    return (
      <AppScreen>
        <View style={styles.center}>
          <Text>{errorMsg}</Text>
        </View>
      </AppScreen>
    );
  }

  if (!location) {
    return (
      <AppScreen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text>Obtendo localizacao...</Text>
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
