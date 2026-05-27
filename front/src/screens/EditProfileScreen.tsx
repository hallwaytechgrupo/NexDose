import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  GradientButton,
  InputField,
  SurfaceCard,
  ToggleRow,
} from "../components/Primitives";
import { AuthUser, UpdateProfileResponse, getApiBaseUrl } from "../services/api";
import { colors, radius } from "../theme/tokens";

type EditProfileScreenProps = {
  onNavigate: (screen: "userMenu") => void;
  onProfileUpdate: (payload: {
    name: string;
    email: string;
    password?: string;
    avatarUri?: string | null;
  }) => Promise<UpdateProfileResponse>;
  user: AuthUser;
};

export function EditProfileScreen({
                                    onNavigate,
                                    onProfileUpdate,
                                    user,
                                  }: EditProfileScreenProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [tel, setTel] = useState("(11) 99999-9999");

  // Inicia com a URL do banco (ajuste o IP se precisar) ou null
  const [avatarUri, setAvatarUri] = useState<string | null>(
      user.avatar_url ? `${getApiBaseUrl()}${user.avatar_url}` : null
  );

  const [wantsPasswordChange, setWantsPasswordChange] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [responseModalTitle, setResponseModalTitle] = useState("");
  const [responseModalMessage, setResponseModalMessage] = useState("");
  const [responseModalVariant, setResponseModalVariant] = useState<
      "success" | "error"
  >("success");

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    if (user.avatar_url) {
      setAvatarUri(`${getApiBaseUrl()}${user.avatar_url}`);
    } else {
      setAvatarUri(null);
    }
  }, [user.email, user.name, user.avatar_url]);


  const openResponseModal = ({
                               title,
                               message,
                               variant,
                             }: {
    title: string;
    message: string;
    variant: "success" | "error";
  }) => {
    setResponseModalTitle(title);
    setResponseModalMessage(message);
    setResponseModalVariant(variant);
    setResponseModalVisible(true);
  };

  // 📸 Função para abrir a galeria
  const handlePickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!granted) {
      openResponseModal({
        title: "Permissão negada",
        message: "Precisamos de acesso às suas fotos para alterar o perfil.",
        variant: "error",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Corta quadrado
      quality: 0.7,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      openResponseModal({
        title: "Campos invalidos",
        message: "Nome e e-mail sao obrigatorios.",
        variant: "error",
      });
      return;
    }

    if (wantsPasswordChange) {
      if (!password || !confirmPassword) {
        openResponseModal({
          title: "Senha incompleta",
          message: "Preencha e confirme a nova senha.",
          variant: "error",
        });
        return;
      }

      if (password !== confirmPassword) {
        openResponseModal({
          title: "Senha invalida",
          message: "A confirmacao da senha nao confere.",
          variant: "error",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await onProfileUpdate({
        name: name.trim(),
        email: email.trim(),
        password: wantsPasswordChange ? password : undefined,
        avatarUri: avatarUri, // Adicionado ao payload!
      });
      setPassword("");
      setConfirmPassword("");
      setWantsPasswordChange(false);
      openResponseModal({
        title: "Atualizacao concluida",
        message: response.message,
        variant: "success",
      });
    } catch (saveError) {
      openResponseModal({
        title: "Falha ao atualizar",
        message:
            saveError instanceof Error
                ? saveError.message
                : "Nao foi possivel atualizar o perfil.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate("userMenu")}>
            <View style={styles.backButton}>
              <Feather name="arrow-left" size={20} color={colors.primary} />
            </View>
          </Pressable>
          <Text style={styles.title}>Editar Perfil</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >

          {/* Preview do Avatar */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handlePickImage}>
              {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                  <View style={styles.avatarFallback}>
                    <Feather name="user" size={48} color={colors.primary} />
                  </View>
              )}
              <View style={styles.editBadge}>
                <Feather name="camera" size={14} color="white" />
              </View>
            </Pressable>
          </View>

          <SurfaceCard>
            <View style={styles.formGroup}>
              <InputField label="Nome completo" value={name} onChangeText={setName} />
              <InputField label="E-mail" value={email} onChangeText={setEmail} />
              <InputField
                  label="Telefone"
                  value={tel}
                  onChangeText={setTel}
                  keyboardType="phone-pad"
              />
              <Text style={styles.helperText}>
                O telefone ainda nao e salvo no backend atual.
              </Text>
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <View style={styles.formGroup}>
              <ToggleRow
                  icon="lock"
                  title="Alterar senha"
                  subtitle="Ative para definir uma nova senha no backend."
                  value={wantsPasswordChange}
                  onValueChange={(value) => {
                    setWantsPasswordChange(value);
                    if (!value) {
                      setPassword("");
                      setConfirmPassword("");
                    }
                  }}
              />

              {wantsPasswordChange ? (
                  <>
                    <InputField
                        label="Nova Senha"
                        secureTextEntry
                        placeholder="Digite a nova senha"
                        value={password}
                        onChangeText={setPassword}
                    />
                    <InputField
                        label="Confirmar nova senha"
                        secureTextEntry
                        placeholder="Confirme a nova senha"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                  </>
              ) : null}
            </View>
          </SurfaceCard>

          <View style={styles.footer}>
            <GradientButton
                title="Salvar Alteracoes"
                onPress={handleSave}
            />
            <GradientButton
                title="Cancelar"
                onPress={() => onNavigate("userMenu")}
                variant="danger"
            />
          </View>
        </ScrollView>

        {isSubmitting ? (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Salvando dados no banco...</Text>
              </View>
            </View>
        ) : null}

        <Modal
            visible={responseModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setResponseModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View
                  style={[
                    styles.modalIconWrap,
                    responseModalVariant === "success"
                        ? styles.modalSuccess
                        : styles.modalError,
                  ]}
              >
                <Feather
                    name={responseModalVariant === "success" ? "check" : "alert-circle"}
                    size={22}
                    color="white"
                />
              </View>
              <Text style={styles.modalTitle}>{responseModalTitle}</Text>
              <Text style={styles.modalMessage}>{responseModalMessage}</Text>
              <GradientButton
                  title="Fechar"
                  variant="danger"
                  onPress={() => {
                    setResponseModalVisible(false);
                    if (responseModalVariant === "success") {
                      onNavigate("userMenu");
                    }
                  }}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12, // Ajustado para alinhar com o botão
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  headerSpacer: {
    width: 42, // Aumentado para equilibrar com o botão
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  // Novos estilos do Avatar
  avatarSection: {
    alignItems: "center",
    marginVertical: 10,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: "white",
  },
  formGroup: {
    gap: 16,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  footer: {
    gap: 12,
    paddingBottom: 24,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "white",
    borderRadius: radius.lg,
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  loadingText: {
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "white",
    borderRadius: radius.lg,
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSuccess: {
    backgroundColor: colors.secondary,
  },
  modalError: {
    backgroundColor: colors.error,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  modalMessage: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
