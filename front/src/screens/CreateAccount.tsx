import React, { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // 📦 Importação do Ícone
import {
  GradientButton,
  InputField,
  SurfaceCard,
} from "../components/Primitives";
import { colors } from "../theme/tokens";

export function CreateAccountScreen({
                                      onRegister,
                                      onNavigateToLogin,
                                    }: {
  onRegister: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: "sponsor" | "caregiver";
  }) => Promise<void>;
  onNavigateToLogin?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"sponsor" | "caregiver">("sponsor");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Estados para controlar a visibilidade das duas senhas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (
        !name.trim() ||
        !email.trim() ||
        !phone.trim() ||
        !password ||
        !confirmPassword
    ) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onRegister({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
      });
    } catch (submitError) {
      setError(
          submitError instanceof Error
              ? submitError.message
              : "Não foi possível criar a conta."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "#F8FAFB" }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
              contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerCopy}>
              <Text style={styles.pageTitle}>Criar conta</Text>

              <Text style={styles.pageSubtitle}>
                Bem-vindo ao NexDose! Vamos comecar criando sua conta.
              </Text>
            </View>

            <SurfaceCard muted>
              <View style={styles.contentBlock}>
                <InputField
                    label="Nome completo"
                    placeholder="Ex: Maria Oliveira"
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    blurOnSubmit={false}
                />
                <InputField
                    ref={emailRef}
                    label="E-mail"
                    placeholder="seuemail@exemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(text) => setEmail(text.toLowerCase())}
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()} // ⚠️ Corrigido para ir pro telefone
                    blurOnSubmit={false}
                />
                <InputField
                    ref={phoneRef}
                    label={"Telefone"}
                    placeholder={"Ex: (11) 91234-5678"}
                    keyboardType={"phone-pad"}
                    value={phone}
                    onChangeText={setPhone}
                    returnKeyType={"next"}
                    onSubmitEditing={() => passwordRef.current?.focus()} // ⚠️ Corrigido para ir pra senha
                    blurOnSubmit={false}
                />

                {/* ✅ Container do Input de Senha Principal */}
                <View style={styles.passwordContainer}>

                  {/* ⚠️ Envelopamos o InputField nesta View com o estilo flex */}
                  <View style={styles.inputSenhaFlex}>
                    <InputField
                        ref={passwordRef}
                        label="Senha"
                        placeholder="Sua senha"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        returnKeyType="next"
                        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                        blurOnSubmit={false}
                        // A propriedade style foi removida daqui!
                    />
                  </View>

                  <Pressable
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  >
                    <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={22}
                        color={colors.textMuted || "#666"}
                    />
                  </Pressable>
                </View>

                {/* ✅ Container do Input de Confirmar Senha */}
                <View style={styles.passwordContainer}>

                  {/* ⚠️ Envelopamos o InputField nesta View com o estilo flex */}
                  <View style={styles.inputSenhaFlex}>
                    <InputField
                        ref={confirmPasswordRef}
                        label="Confirmar senha"
                        placeholder="Confirme sua senha"
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                        // A propriedade style foi removida daqui!
                    />
                  </View>

                  <Pressable
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  >
                    <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={22}
                        color={colors.textMuted || "#666"}
                    />
                  </Pressable>
                </View>
              </View>
            </SurfaceCard>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <GradientButton
                title={isSubmitting ? "Criando conta..." : "Criar conta"}
                onPress={handleSubmit}
            />

            {onNavigateToLogin && (
                <Pressable onPress={onNavigateToLogin} style={{ marginBottom: 20 }}>
                  <Text style={styles.link}>
                    Já tem uma conta? <Text style={styles.linkHighlight}>Faca login</Text>
                  </Text>
                </Pressable>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 24,
  },
  headerCopy: {
    marginBottom: 5,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
    marginTop: 12,
  },
  pageSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
  contentBlock: {
    gap: 10,
  },
  // ✅ Estilos para os campos de senha (iguais aos do Login)
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  inputSenhaFlex: {
    flex: 1,
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    height: "100%",
    justifyContent: "center",
    zIndex: 1,
    elevation: 1,
    paddingTop: Platform.OS === "ios" ? 20 : 18,
  },
  roleSection: {
    gap: 10,
  },
  roleLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  roleOptions: {
    flexDirection: "row",
    gap: 12,
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