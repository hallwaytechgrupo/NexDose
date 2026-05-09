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
  View 
} from "react-native";
import {
  Chip,
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
    password: string;
    role: "responsavel" | "caregiver";
  }) => Promise<void>;
  onNavigateToLogin?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"responsavel" | "caregiver">("responsavel");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas nao coincidem.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onRegister({ name: name.trim(), email: email.trim(), password, role });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nao foi possivel criar a conta.");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
      // 1. O KeyboardAvoidingView deve ser o container externo (ou logo abaixo do SafeArea)
      <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: '#F8FAFB' }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {/* 2. O ScrollView vai DENTRO para permitir que o conteúdo role quando o teclado subir */}
          <ScrollView
              contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} // flexGrow garante que o fundo cubra tudo
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
                    // Garante que o e-mail seja sempre salvo em minúsculo
                    onChangeText={(text) => setEmail(text.toLowerCase())}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                />
                <InputField
                    ref={passwordRef}
                    label="Senha"
                    placeholder="Sua senha"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    blurOnSubmit={false}
                />
                <InputField
                    ref={confirmPasswordRef}
                    label="Confirmar senha"
                    placeholder="Confirme sua senha"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit} // Teclar OK no teclado já cria a conta
                />

                <View style={styles.roleSection}>
                  <Text style={styles.roleLabel}>Perfil</Text>
                  <View style={styles.roleOptions}>
                    <Chip
                        label="Responsavel"
                        active={role === "responsavel"}
                        onPress={() => setRole("responsavel")}
                    />
                    <Chip
                        label="Cuidador"
                        active={role === "caregiver"}
                        onPress={() => setRole("caregiver")}
                    />
                  </View>
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
                    Ja tem uma conta? <Text style={styles.linkHighlight}>Faca login</Text>
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
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
  },
  pageSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
  contentBlock: {
    gap: 18,
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
