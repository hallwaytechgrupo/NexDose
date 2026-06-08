import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // 📦 Importação do Ícone
import { AppScreen, GradientButton, InputField } from "../components/Primitives";
import { colors } from "../theme/tokens";

export function LoginScreen({
                              onLogin,
                              onNavigateToSignUp,
                            }: {
  onLogin: (email: string, password: string) => Promise<void>;
  onNavigateToSignUp: () => void;
}) {
  const passwordInputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Estado que controla a visibilidade da senha
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onLogin(email.trim(), password);
    } catch (submitError) {
      setError(
          submitError instanceof Error
              ? submitError.message
              : "Nao foi possivel entrar."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <AppScreen>
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardContainer}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
              <Image
                  source={require("../assets/img/nexdose1.png")}
                  style={styles.logo}
              />

              <View style={styles.form}>
                <InputField
                    label="E-mail"
                    placeholder="seuemail@exemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    value={email}
                    onChangeText={setEmail}
                />

                {/* ✅ Container exclusivo para agrupar o Input de Senha e o Ícone */}
                <View style={styles.passwordContainer}>
                  <InputField
                      ref={passwordInputRef}
                      label="Senha"
                      placeholder="Sua senha"
                      secureTextEntry={!showPassword} // Alterna entre true e false
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit}
                      value={password}
                      onChangeText={setPassword}
                  />

                  {/* Ícone posicionado por cima do Input */}
                  <Pressable
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 15, bottom: 25, left: 15, right: 15 }} // Aumenta a área de clique
                  >
                    <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={22}
                        color={colors.textMuted || "#666"}
                    />
                  </Pressable>
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <GradientButton
                  title={isSubmitting ? "Entrando..." : "Entrar"}
                  onPress={handleSubmit}
              />
              {isSubmitting ? <ActivityIndicator color={colors.primary} /> : null}

              <Pressable onPress={onNavigateToSignUp}>
                <Text style={styles.link}>
                  Nao tem uma conta? <Text style={styles.linkHighlight}>Cadastre-se</Text>
                </Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </AppScreen>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
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
    marginBottom: 2,
    resizeMode: "contain",
  },
  form: {
    gap: 6,
  },
  // ✅ Novos estilos para o container da senha e o ícone
  passwordContainer: {
    position: "relative",
    justifyContent: "center",
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    bottom: 35,
    zIndex: 1,
    elevation: 1,
  },
  link: {
    color: colors.textMuted,
    textAlign: "center",
  },
  linkHighlight: {
    color: colors.primary,
    fontWeight: "bold",
  },
  errorText: {
    color: colors.error,
    textAlign: "center",
    fontWeight: "600",
  },
});