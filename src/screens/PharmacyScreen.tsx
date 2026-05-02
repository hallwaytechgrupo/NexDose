import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { AppScreen, InputField } from '../components/Primitives';
import { colors } from '../theme/tokens';

export function PharmacyScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('farmácia');

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('A permissão para acessar a localização foi negada');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

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
          <Text>Obtendo sua localização...</Text>
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
        showsUserLocation={true}
      >
        {/* Marcadores para farmácias podem ser adicionados aqui */}
      </MapView>
      <View style={styles.searchContainer}>
        <InputField
          label="Buscar farmácias próximas"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Digite o nome ou endereço"
        />
      </View>
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
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
});
