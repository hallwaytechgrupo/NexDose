import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../components/Primitives";
import { colors } from "../theme/tokens";

export function DeviceHomeScreen({ route }: any) {
  const { dispenserId } = route.params;

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Device Home</Text>
        <Text style={styles.subtitle}>Dispenser ID: {dispenserId}</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
