import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";

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

export function SettingsScreen() {
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(
    notificationSettings.reduce((acc, item) => {
      acc[item.key] = item.enabled;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const handleToggleChange = (key: string, value: boolean) => {
    setToggleStates((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  return (
    <AppScreen>
      {/* ScrollView é essencial para evitar que componentes sumam em telas menores */}
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

          <View style={styles.block}>
            <SectionTitle>Responsável principal</SectionTitle>
            <GlassCard>
              <View style={styles.form}>
                <InputField label="Nome completo" value="Maria Oliveira" />
                <InputField label="Telefone" value="+55 (11) 99999-9999" />
                <InputField label="E-mail" value="maria@email.com" />
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
                    value={toggleStates[item.key]}
                    onValueChange={(value) => handleToggleChange(item.key, value)}
                  />
                ))}
              </View>
            </GlassCard>
          </View>

          <View style={styles.actionArea}>
            <GradientButton title="Salvar configurações" />
            
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
  scrollContent: {
    paddingBottom: 40, 
  // Espaço extra no final para o botão não ficar colado
  },
  container: {
    paddingHorizontal: 20, // Garante que nada encoste nas bordas da tela
    gap: 24, // Espaçamento consistente entre os blocos principais
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28, // Reduzi levemente para evitar quebra de linha em telas pequenas
    fontWeight: "900",
    marginBottom: 8,
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  block: {
    gap: 12,
  },
  form: {
    gap: 16,
  },
  actionArea: {
    marginTop: 12,
    gap: 16,
  },
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