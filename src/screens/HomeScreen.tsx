import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { adherence, quickActions, TabKey } from "../data/mockData";
import {
  AppScreen,
  GlassCard,
  SectionTitle,
  SurfaceCard,
} from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import { Feather } from "@expo/vector-icons";

export function HomeScreen({
  onNavigate,
}: {
  onNavigate: (tab: TabKey) => void;
}) {
  return (
    <AppScreen>
      <GlassCard>
        <Text style={styles.heroLabel}>Proxima dose em</Text>
        <View style={styles.ringWrap}>
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Text style={styles.heroTime}>02:45h</Text>
              <Text style={styles.heroMedication}>Amoxicilina 500mg</Text>
            </View>
          </View>
        </View>
        <GradientAction
          label="Confirmar agora"
          onPress={() => onNavigate("history")}
        />
      </GlassCard>

      <View style={styles.grid}>
        <SurfaceCard muted>
          <View style={styles.statusHeader}>
            <Feather name="battery-charging" size={24} color={colors.text} />
            <Text style={styles.stablePill}>Estavel</Text>
          </View>
          <Text style={styles.metaLabel}>Status do dispositivo</Text>
          <Text style={styles.cardTitle}>Bateria 82%</Text>
          <Text style={styles.cardBody}>
            Proxima recarga estimada em 4 dias.
          </Text>
        </SurfaceCard>

        <SurfaceCard>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>Aderencia semanal</Text>
            <Feather name="arrow-up-circle" size={24} color={colors.primary} />
          </View>
          <View style={styles.chartRow}>
            {adherence.map((value, index) => (
              <View
                key={`${value}-${index}`}
                style={[
                  styles.bar,
                  { height: value },
                  index === 4 ? styles.barActive : styles.barIdle,
                ]}
              />
            ))}
          </View>
          <View style={styles.daysRow}>
            {["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.dayLabel}>
                {day}
              </Text>
            ))}
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.sectionBlock}>
        <SectionTitle>Acesso rapido</SectionTitle>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => {
                if (action.key === "history") onNavigate("history");
                if (action.key === "caregiver") onNavigate("settings");
                if (action.key === "pharmacy") onNavigate("medications");
                
              }}
              style={styles.actionCard}
            >
              <View style={styles.actionIconWrap}>
                <Feather
                  name={action.icon as any}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </AppScreen>
  );
}

function GradientAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient colors={[colors.primary, colors.primaryBright]} style={styles.heroButton}>
        <Text style={styles.heroButtonText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "800",
    textAlign: "center",
    
  },
  ringWrap: {
    alignItems: "center",
    marginVertical: 20,
    
  },
  ringOuter: {
    width: 220,
    height: 220,
    borderRadius: radius.full,
    borderWidth: 12,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  ringInner: {
    width: 176,
    height: 176,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLowest,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  heroTime: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "900",
  },
  heroMedication: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  heroButton: {
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: "center",
  },
  heroButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  grid: {
    gap: 16,

  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  bigIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  stablePill: {
    backgroundColor: colors.secondarySoft,
    color: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  chartRow: {
    height: 110,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  barIdle: {
    backgroundColor: colors.primarySoft,
  },
  barActive: {
    backgroundColor: colors.primary,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  sectionBlock: {
    gap: 16,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: "47%",
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 10,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.tertiarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
