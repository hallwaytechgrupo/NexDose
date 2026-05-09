import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  GradientButton,
  InputField,
  SurfaceCard,
  ToggleRow,
} from "../components/Primitives";
import { AuthUser, UpdateProfileResponse } from "../services/api";
import { colors, radius } from "../theme/tokens";

type EditProfileScreenProps = {
  onNavigate: (screen: "userMenu") => void;
  onProfileUpdate: (payload: {
    name: string;
    email: string;
    password?: string;
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
  }, [user.email, user.name]);

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
          <Feather name="arrow-left" size={24} color={colors.text} />
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
        <Pressable style={styles.changePhotoButton}>
          <Feather name="camera" size={16} color={colors.primary} />
          <Text style={styles.changePhotoButtonText}>Mudar foto do perfil</Text>
        </Pressable>

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
            title={isSubmitting ? "Salvando..." : "Salvar Alteracoes"}
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  formGroup: {
    gap: 16,
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  changePhotoButtonText: {
    color: colors.primary,
    fontWeight: "700",
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
