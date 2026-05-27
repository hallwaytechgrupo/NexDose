import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import axios from "axios";
import { Feather } from "@expo/vector-icons";

import { notificationSettings } from "../data/mockData";
import {
  AppScreen,
  GlassCard,
  GradientButton,
  InputField,
  SectionTitle,
  ToggleRow,
} from "../components/Primitives";
import { colors } from "../theme/tokens";
import { getApiBaseUrl, savePushToken } from "../services/api";
import { registerForPushNotificationsAsync } from "../services/notifications";

interface SettingsScreenProps {
  token: string;
  dispenserId: number | null;
}

export function SettingsScreen({ token, dispenserId }: SettingsScreenProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Preferencias sao por usuario + dispenser (independentes por conta).
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (!dispenserId) return;
    fetchSettings().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, dispenserId]);

  const fetchSettings = async () => {
    if (!dispenserId) return;
    const API_BASE_URL = getApiBaseUrl();

    try {
      setIsLoading(true);

      const [settingsRes, prefsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/dispensers/${dispenserId}/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/api/dispensers/${dispenserId}/my-notification-preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const settings = settingsRes.data as any;
      const prefs = prefsRes.data as any;

      setName(settings?.responsable_name || "");
      setPhone(settings?.responsable_phone || "");
      setEmail(settings?.responsable_email || "");
      setToggleStates(prefs?.preferences || {});
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados de configuração.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!dispenserId) return;
    const API_BASE_URL = getApiBaseUrl();

    try {
      setIsSaving(true);

      const settingsPayload = {
        responsable_name: name,
        responsable_phone: phone,
        responsable_email: email,
      };

      await Promise.all([
        axios.put(`${API_BASE_URL}/api/dispensers/${dispenserId}/settings`, settingsPayload, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.put(
          `${API_BASE_URL}/api/dispensers/${dispenserId}/my-notification-preferences`,
          { preferences: toggleStates },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      Alert.alert("Sucesso!", "Configurações atualizadas com sucesso.");
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);
      Alert.alert("Erro", "Falha ao salvar as alterações no servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleChange = async (key: string, value: boolean) => {
    setToggleStates((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (!value) return;

    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await savePushToken(token, pushToken);
      }
    } catch (error) {
      console.error("Erro ao ativar notificações:", error);
      Alert.alert("Notificações", "Não foi possível ativar as notificações neste aparelho.");
    }
  };

  if (!dispenserId) {
    return (
      <AppScreen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <Text style={{ color: colors.textMuted, textAlign: "center" }}>
            Selecione um dispositivo para ver as configurações.
          </Text>
        </View>
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textMuted }}>Carregando setup...</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <GlassCard>
            <Text style={styles.eyebrow}>Central de alertas</Text>
            <Text style={styles.title}>NexDose setup</Text>
            <Text style={styles.body}>
              Gerencie quem recebe atualizações e quais eventos são prioritários.
            </Text>
          </GlassCard>

          <View style={styles.block}>
            <SectionTitle>Responsável principal</SectionTitle>
            <GlassCard>
              <View style={styles.form}>
                <InputField label="Nome completo" value={name} onChangeText={setName} />
                <InputField label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <InputField
                  label="E-mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </GlassCard>
          </View>

          <View style={styles.block}>
            <SectionTitle>Preferências de notificações</SectionTitle>
            <GlassCard>
              <View style={styles.form}>
                {notificationSettings.map((item) => (
                  <ToggleRow
                    key={item.key}
                    icon={item.icon as any}
                    title={item.title}
                    subtitle={item.subtitle}
                    value={!!toggleStates[item.key]}
                    onValueChange={(value) => handleToggleChange(item.key, value)}
                  />
                ))}
              </View>
            </GlassCard>
          </View>

          <View style={styles.actionArea}>
            <GradientButton
              title={isSaving ? "Salvando..." : "Salvar configurações"}
              onPress={handleSaveSettings}
              disabled={isSaving}
            />

            <View style={styles.footerContainer}>
              <Feather name="shield" size={12} color={colors.textMuted} />
              <Text style={styles.footer}>Protocolo de segurança ativo</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  container: { paddingHorizontal: 20, gap: 24 },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", marginBottom: 8 },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 22 },
  block: { gap: 12 },
  form: { gap: 16 },
  actionArea: { marginTop: 12, gap: 16 },
  footerContainer: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 8,
    opacity: 0.7,
  },
  footer: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
});

