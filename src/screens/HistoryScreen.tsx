import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { historyItems } from "../data/mockData";
import {
  AppScreen,
  GradientButton,
  SectionTitle,
  SurfaceCard,
} from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import { Feather } from "@expo/vector-icons";

export function HistoryScreen() {
  return (
    <AppScreen>
      <View style={styles.overview}>
        <View>
          <SectionTitle>Status do dia</SectionTitle>
          <Text style={styles.headline}>Controle de dosagem</Text>
        </View>
        <View style={styles.percentageBlock}>
          <Text style={styles.percentage}>85%</Text>
          <Text style={styles.percentageLabel}>Adesao</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      <View style={styles.block}>
        <SectionTitle>Historico de hoje</SectionTitle>
        <View style={styles.list}>
          {historyItems.map((item) => (
            <View
              key={`${item.name}-${item.time}`}
              style={[
                styles.historyCard,
                item.status === "missed"
                  ? styles.historyMissed
                  : styles.historyTaken,
              ]}
            >
              <View style={styles.historyCopy}>
                <View
                  style={[
                    styles.historyIconWrap,
                    item.status === "missed"
                      ? styles.historyIconWrapMissed
                      : styles.historyIconWrapTaken,
                  ]}
                >
                  <Feather
                    name={item.status === "missed" ? "alert-triangle" : "check"}
                    size={20}
                    color={
                      item.status === "missed" ? colors.error : colors.secondary
                    }
                  />
                </View>
                <View style={styles.historyText}>
                  <Text style={styles.historyTitle}>{item.name}</Text>
                  <Text
                    style={[
                      styles.historySubtitle,
                      item.status === "missed"
                        ? styles.historySubtitleMissed
                        : undefined,
                    ]}
                  >
                    {item.time}
                  </Text>
                </View>
              </View>
              <Text
                style={
                  item.status === "missed"
                    ? styles.pendingBadge
                    : styles.doneBadge
                }
              >
                {item.status === "missed" ? "Pendente" : "Tomado"}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <SectionTitle>Monitoramento ativo</SectionTitle>
        <SurfaceCard muted>
          <View style={styles.caregiverHeader}>
            <View style={styles.caregiverAvatar}>
              <Text style={styles.caregiverAvatarText}>HS</Text>
            </View>
            <View style={styles.caregiverCopy}>
              <Text style={styles.caregiverEyebrow}>
                Responsavel cadastrado
              </Text>
              <Text style={styles.caregiverName}>Dra. Helena Silva</Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Feather name="bell" size={12} color={colors.secondary} />
                <Text style={styles.caregiverMeta}>Notificacoes ativas</Text>
              </View>
            </View>
          </View>
          <GradientButton title="Ligar para responsavel" />
          <Text style={styles.helpCopy}>
            Em caso de emergencia, o responsavel sera notificado com sua
            localizacao atual.
          </Text>
        </SurfaceCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  overview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headline: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 6,
  },
  percentageBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  percentage: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: "900",
  },
  percentageLabel: {
    color: colors.outline,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFill: {
    width: "85%",
    height: "100%",
    backgroundColor: colors.primary,
  },
  block: {
    gap: 16,
  },
  list: {
    gap: 12,
  },
  historyCard: {
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  historyTaken: {
    backgroundColor: colors.surfaceLowest,
  },
  historyMissed: {
    backgroundColor: colors.errorSoft,
  },
  historyCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  historyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  historyIconWrapTaken: {
    backgroundColor: "rgba(111,251,133,0.3)",
  },
  historyIconWrapMissed: {
    backgroundColor: "rgba(186,26,26,0.12)",
  },
  historyIcon: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  historyText: {
    flex: 1,
    gap: 4,
  },
  historyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  historySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  historySubtitleMissed: {
    color: colors.error,
    fontWeight: "700",
  },
  doneBadge: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: "800",
  },
  pendingBadge: {
    color: colors.white,
    backgroundColor: colors.tertiary,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  caregiverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  caregiverAvatar: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: colors.surfaceLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  caregiverAvatarText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "900",
  },
  caregiverCopy: {
    flex: 1,
    gap: 4,
  },
  caregiverEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  caregiverName: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  caregiverMeta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  helpCopy: {
    marginTop: 14,
    color: colors.outline,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
});
