import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AppScreen,
  GradientButton,
  InputField,
} from "../components/Primitives";
import { colors } from "../theme/tokens";

export function SignUpScreen({
  onSignUp,
  onNavigateToLogin,
}: {
  onSignUp: () => void;
  onNavigateToLogin: () => void;
}) {
  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Crie sua conta</Text>
        <Text style={styles.subtitle}>
          Comece a gerenciar seus medicamentos de forma inteligente.
        </Text>

        <View style={styles.form}>
          <InputField label="Nome completo" placeholder="Seu nome completo" />
          <InputField label="E-mail" placeholder="seuemail@exemplo.com" />
          <InputField
            label="Senha"
            placeholder="Crie uma senha forte"
            secureTextEntry
          />
        </View>

        <GradientButton title="Cadastrar" onPress={onSignUp} />

        <Pressable onPress={onNavigateToLogin}>
          <Text style={styles.link}>
            Já tem uma conta? <Text style={styles.linkHighlight}>Faça login</Text>
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    gap: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  form: {
    gap: 18,
  },
  link: {
    color: colors.textMuted,
    textAlign: "center",
  },
  linkHighlight: {
    color: colors.primary,
    fontWeight: "bold",
  },
});