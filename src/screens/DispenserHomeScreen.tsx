import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppScreen, GradientButton } from '../components/Primitives';
import { colors } from '../theme/tokens';

interface DispenserHomeScreenProps {
  dispenserId: number;
  onChangeDispenser: () => void;
}

export function DispenserHomeScreen({ dispenserId, onChangeDispenser }: DispenserHomeScreenProps) {
  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Home do Dispositivo</Text>
        <Text style={styles.subtitle}>
          Você está visualizando o dispensador com ID:
        </Text>
        <Text style={styles.dispenserId}>{dispenserId}</Text>

        <View style={styles.buttonContainer}>
          <GradientButton
            title="Trocar de Dispositivo"
            onPress={onChangeDispenser}
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  dispenserId: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonContainer: {
    marginTop: 32,
    width: '100%',
  },
});
