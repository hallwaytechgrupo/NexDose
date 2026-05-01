import React from "react";
import { Pressable, StyleSheet, Text, View, Image } from "react-native";
import {
  AppScreen,
  GradientButton,
  InputField,
} from "../components/Primitives";
import { colors } from "../theme/tokens";
import { CreateAccountScreen } from "./CreateAccount";

export function LoginScreen({
  onLogin,
  onNavigateToSignUp,
}: {
  onLogin: () => void;
  onNavigateToSignUp: () => void;
}) {
  return (
    <AppScreen>
      <View style={styles.container}>
        <Image
          source={require("../../img/nexdose1.png")}
          style={styles.logo}
        />
       

        <View style={styles.form}>
          <InputField label="E-mail" placeholder="seuemail@exemplo.com" />
          <InputField
            label="Senha"
            placeholder="Sua senha"
            secureTextEntry
          />
        </View>

        <GradientButton title="Entrar" onPress={onLogin} />

        <Pressable onPress={onNavigateToSignUp}>
          <Text style={styles.link}>
            Não tem uma conta?{" "}
            <Text style={styles.linkHighlight}>Cadastre-se</Text>
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
  logo: {
    width: 350,
    height: 250,
    alignSelf: "center",
    marginTop: 40,
    marginBottom: 14,
    resizeMode: "contain",
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