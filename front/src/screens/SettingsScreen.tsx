import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert } from "react-native";
import axios from "axios"; // ✅ Para fazer as requisições à API

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
import { Feather } from "@expo/vector-icons";

// ✅ 1. Define as propriedades que a tela precisa receber do AppShell
interface SettingsScreenProps {
  token: string;
  dispenserId: number | null;
}

export function SettingsScreen({ token, dispenserId }: SettingsScreenProps) {
  // --- ESTADOS DOS FORMULÁRIOS ---
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // --- ESTADO DAS NOTIFICAÇÕES ---
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});

  // --- ESTADOS DE CONTROLE ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ✅ 2. CARREGAR CONFIGURAÇÕES DO BANCO DE DADOS
  useEffect(() => {
    if (token && dispenserId) {
      fetchSettings();
    }
  }, [token, dispenserId]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      // Altere a rota abaixo para bater no endpoint correto do seu Express
      const response = await axios.get(`http://192.168.15.8:3000/api/dispensers/${dispenserId}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        const { responsable_name, responsable_phone, responsable_email, preferences } = response.data;

        setName(responsable_name || "");
        setPhone(responsable_phone || "");
        setEmail(responsable_email || "");

        // Sincroniza as preferências do banco (ex: { missed_dose: true, low_battery: false })
        setToggleStates(preferences || {});
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados de configuração.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 3. SALVAR ALTERAÇÕES NO BANCO DE DADOS
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      const payload = {
        responsable_name: name,
        responsable_phone: phone,
        responsable_email: email,
        preferences: toggleStates, // Envia o objeto de notificações modificado
      };

      await axios.put(`http://192.168.15.8:3000/api/dispensers/${dispenserId}/settings`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert("Sucesso! 🎉", "Configurações atualizadas com sucesso.");
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);
      Alert.alert("Erro", "Falha ao salvar as alterações no servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleChange = (key: string, value: boolean) => {
    setToggleStates((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Tela de carregamento enquanto busca os dados no Express
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
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.container}>

            <GlassCard>
              <Text style={styles.eyebrow}>Central de alertas</Text>
              <Text style={styles.title}>NexDose setup</Text>
              <Text style={styles.body}>
                Gerencie quem recebe atualizações e quais eventos são prioritários.
              </Text>
            </GlassCard>

            {/* Bloco do Responsável Principal conectado aos states */}
            <View style={styles.block}>
              <SectionTitle>Responsável principal</SectionTitle>
              <GlassCard>
                <View style={styles.form}>
                  <InputField
                      label="Nome completo"
                      value={name}
                      onChangeText={setName} // ✅ Atualiza o estado ao digitar
                  />
                  <InputField
                      label="Telefone"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                  />
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

            {/* Preferências de Notificações */}
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
                          // ✅ Se a chave não existir ainda no banco, joga "false" por segurança
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
                  onPress={handleSaveSettings} // ✅ Dispara a rota PUT
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
  eyebrow: { color: colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.8, marginBottom: 8 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", marginBottom: 8 },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 22 },
  block: { gap: 12 },
  form: { gap: 16 },
  actionArea: { marginTop: 12, gap: 16 },
  footerContainer: { flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 8, opacity: 0.7 },
  footer: { color: colors.textMuted, textAlign: "center", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2 },
});