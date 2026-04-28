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
import { Feather } from "@expo/vector-icons";

export function RegisterMedicationScreen({
  onNavigate,
}: {
  onNavigate: (tab: TabKey) => void;
}) {
  const [selectedType, setSelectedType] = useState("capsule");
  const [selectedInterval, setSelectedInterval] = useState("8h");

  return (
    <AppScreen>
      <View style={styles.headerCopy}>
        <Text style={styles.pageTitle}>Novo registro</Text>
        <Text style={styles.pageSubtitle}>Configuracao de medicamento</Text>
      </View>

      <SurfaceCard muted>
        <View style={styles.contentBlock}>
          <InputField
            label="Nome do medicamento"
            placeholder="Ex: Amoxicilina 500mg"
          />

          <View style={styles.contentBlock}>
            <SectionTitle>Forma farmaceutica</SectionTitle>
            <View style={styles.typeGrid}>
              {medicationTypes.map((item) => {
                const active = item.key === selectedType;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setSelectedType(item.key)}
                    style={[
                      styles.typeCard,
                      active ? styles.typeCardActive : undefined,
                    ]}
                  >
                    <Feather
                      name={item.icon as any}
                      size={24}
                      color={active ? colors.white : colors.text}
                    />
                    <Text
                      style={[
                        styles.typeText,
                        active ? styles.typeTextActive : undefined,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.twoCols}>
            <View style={styles.column}>
              <SectionTitle>Primeira dose</SectionTitle>
              <View style={styles.timePicker}>
                <Text style={styles.timePickerMain}>08:30</Text>
                <Text style={styles.timePickerGhost}>07 09 15 45</Text>
              </View>
            </View>

            <View style={styles.column}>
              <SectionTitle>Intervalo</SectionTitle>
              <View style={styles.chipsWrap}>
                {intervals.map((interval) => (
                  <Chip
                    key={interval}
                    label={interval}
                    active={interval === selectedInterval}
                    onPress={() => setSelectedInterval(interval)}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.timelineBlock}>
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineTitle}>Proximas doses estimadas</Text>
              <Text style={styles.timelineBadge}>Timeline ativa</Text>
            </View>
            <View style={styles.scheduleRow}>
              {schedulePreview.map((item) => (
                <View
                  key={`${item.label}-${item.value}`}
                  style={styles.scheduleCard}
                >
                  <Text style={styles.scheduleLabel}>{item.label}</Text>
                  <Text style={styles.scheduleValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </SurfaceCard>

      <GradientButton
        title="Finalizar registro"
        onPress={() => onNavigate("home")}
      />
      <Pressable onPress={() => onNavigate("home")}>
        <Text style={styles.cancel}>Cancelar</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerCopy: {
    gap: 8,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 42,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  pageSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "700",
  },
  contentBlock: {
    gap: 22,
  },
  typeGrid: {
    flexDirection: "row",
    gap: 12,
  },
  typeCard: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLowest,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 10,
  },
  typeCardActive: {
    backgroundColor: colors.primary,
  },
  typeIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  typeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  typeTextActive: {
    color: colors.white,
  },
  twoCols: {
    gap: 20,
  },
  column: {
    gap: 12,
  },
  timePicker: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.lg,
    paddingVertical: 22,
    alignItems: "center",
    gap: 8,
  },
  timePickerMain: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: "900",
  },
  timePickerGhost: {
    color: colors.outline,
    fontSize: 14,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timelineBlock: {
    gap: 14,
    paddingTop: 8,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  timelineTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  timelineBadge: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  scheduleRow: {
    flexDirection: "row",
    gap: 10,
  },
  scheduleCard: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  scheduleLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  scheduleValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  cancel: {
    color: colors.outline,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
  },
});
