import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  intervals,
  medicationTypes,
  schedulePreview,
  TabKey,
} from "../data/mockData";
import {
  AppScreen,
  Chip,
  GradientButton,
  InputField,
  SectionTitle,
  SurfaceCard,
} from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function CreateAccountScreen({
  onNavigate,
  onNavigateToLogin,
}: { 
  onNavigate: (tab: TabKey) => void;
  onNavigateToLogin?: () => void;
}) {
    return (
        <AppScreen>
            <View style={styles.headerCopy}>
                <Text style={styles.pageTitle}>Criar conta</Text>
                <Text style={styles.pageSubtitle}>Bem-vindo ao NexDose! Vamos começar criando sua conta.</Text>
            </View>

            <SurfaceCard muted>
                <View style={styles.contentBlock}>
                    <InputField label="Nome completo" placeholder="Ex: Maria Oliveira" />
                    <InputField label="E-mail" placeholder="seuemail@exemplo.com" />
                    <InputField
                        label="Senha"
                        placeholder="Sua senha"
                        secureTextEntry
                    />
                    <InputField
                        label="Confirmar senha"
                        placeholder="Confirme sua senha"
                        secureTextEntry
                    />
                </View>
            </SurfaceCard>

            <GradientButton title="Criar conta" onPress={() => onNavigate("home")} />

            {onNavigateToLogin && (
              <Pressable onPress={onNavigateToLogin}>
                <Text style={styles.link}>
                  Já tem uma conta?{" "}
                  <Text style={styles.linkHighlight}>Faça login</Text>
                </Text>
              </Pressable>
            )}
        </AppScreen>
    );
}

const styles = StyleSheet.create({
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
  link: {
    color: colors.textMuted,
    textAlign: "center",
  },
  linkHighlight: {
    color: colors.primary,
    fontWeight: "bold",
  },
});


