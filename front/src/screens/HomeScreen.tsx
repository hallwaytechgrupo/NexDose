import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { quickActions, TabKey } from "../data/mockData"; // ❌ Removido o 'adherence' do mockData
import {
  AppScreen,
  GlassCard,
  SectionTitle,
  SurfaceCard,
} from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import { Feather } from "@expo/vector-icons";
import { getMedications, getWeeklyAdherence } from "../services/api"; // ✅ Importada a nova função da API

interface HomeScreenProps {
  token: string;
  dispenserId: number | null;
  onNavigate: (tab: TabKey) => void;
}

export function HomeScreen({ token, dispenserId, onNavigate }: HomeScreenProps) {
  // 1. ESTADO DE UI
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 2. QUERY 1: Próximo Medicamento e Relógio
  const { data: medData, isLoading: isLoadingMeds } = useQuery({
    queryKey: ['nextMedication', dispenserId],
    enabled: !!dispenserId && !!token,
    refetchInterval: 60000, // Atualiza a cada 1 min
    queryFn: async () => {
      console.log("➔ DISPARANDO API: Chamando getMedications via React Query...");
      const meds = await getMedications(token, dispenserId!);

      if (!meds || !Array.isArray(meds) || meds.length === 0) {
        return { nextMed: null, countdown: "--:--" };
      }

      const now = new Date();
      let absoluteClosestMed: any = null;
      let minDiff = Infinity;
      let calculatedCountdown = "--:--";

      meds.forEach((med: any) => {
        const nextDoseStr = med.nextDose || med.start_time || med.startTime;
        const intervalHours = Number(med.interval || med.interval_hours) || 8;

        if (!nextDoseStr || nextDoseStr === "--:--" || nextDoseStr.includes("NaN")) return;

        let doseDate = new Date();

        if (nextDoseStr.includes("T") || nextDoseStr.includes("-")) {
          const parsedIso = new Date(nextDoseStr);
          if (!isNaN(parsedIso.getTime())) {
            doseDate = parsedIso;
          }
        } else {
          const [hourStr, minuteStr] = nextDoseStr.split(":");
          const baseHour = parseInt(hourStr, 10);
          const baseMinute = parseInt(minuteStr, 10) || 0;

          if (isNaN(baseHour)) return;

          doseDate.setHours(baseHour, baseMinute, 0, 0);
          doseDate.setDate(doseDate.getDate() - 1);
        }

        while (doseDate <= now) {
          doseDate.setHours(doseDate.getHours() + intervalHours);
        }

        const diff = doseDate.getTime() - now.getTime();

        if (diff < minDiff) {
          minDiff = diff;
          absoluteClosestMed = {
            name: med.name,
            dosage: med.dosage || "",
          };

          const totalMinutes = Math.floor(diff / 1000 / 60);
          const hrs = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          calculatedCountdown = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        }
      });

      return { nextMed: absoluteClosestMed, countdown: calculatedCountdown };
    }
  });

  // ✅ 3. QUERY 2: Aderência Semanal (Dados do Banco)
  const { data: adherenceData = [] } = useQuery({
    queryKey: ['adherence', dispenserId],
    enabled: !!dispenserId && !!token,
    queryFn: async () => {
      console.log("➔ DISPARANDO API: Chamando getWeeklyAdherence...");
      try {
        const result = await getWeeklyAdherence(token, dispenserId!);
        console.log("✅ DADOS QUE CHEGARAM DO BANCO:", result);
        return result;
      } catch (error) {
        console.log("❌ ERRO AO PUXAR GRÁFICO:", error);
        throw error;
      }
    }
  });

  // Variáveis derivadas
  const nextMed = medData?.nextMed;
  const countdown = medData?.countdown || "--:--";

  // 4. EFEITO VISUAL DO RELÓGIO
  useEffect(() => {
    if (nextMed) {
      Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [nextMed, pulseAnim]);

  return (
      <AppScreen>
        <GlassCard>
          <Text style={styles.heroLabel}>Proxima dose em</Text>
          <View style={styles.ringWrap}>
            <Animated.View style={[styles.ringOuter, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.ringInner}>
                {isLoadingMeds ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : nextMed ? (
                    <>
                      <Text style={styles.heroTime}>{countdown}</Text>
                      <Text style={styles.heroMedication}>
                        {nextMed.name} {nextMed.dosage}
                      </Text>
                    </>
                ) : (
                    <>
                      <Text style={[styles.heroTime, { fontSize: 24 }]}>--:--</Text>
                      <Text style={[styles.heroMedication, { color: colors.textMuted }]}>
                        Nenhum agendado
                      </Text>
                    </>
                )}
              </View>
            </Animated.View>
          </View>
        </GlassCard>

        <View style={styles.grid}>
          {/* CARD DE STATUS DA BATERIA */}
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

          {/* ✅ CARD DO GRÁFICO ATUALIZADO PARA DADOS REAIS */}
          <SurfaceCard>
            <View style={styles.chartHeader}>
              <Text style={styles.cardTitle}>Aderencia semanal</Text>
              <Feather name="arrow-up-circle" size={24} color={colors.primary} />
            </View>

            <View style={styles.chartRow}>
              {adherenceData.length > 0 ? (
                  adherenceData.map((item: any, index: number) => (
                      <View
                          key={`bar-${index}`}
                          style={[
                            styles.bar,
                            { height: `${item.percentage}%`, minHeight: '5%' }, // ✅ Altura dinâmica em %
                            index === adherenceData.length - 1 ? styles.barActive : styles.barIdle,
                          ]}
                      />
                  ))
              ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Carregando gráfico...</Text>
                  </View>
              )}
            </View>

            <View style={styles.daysRow}>
              {adherenceData.length > 0 ? (
                  adherenceData.map((item: any, index: number) => (
                      <Text key={`day-${index}`} style={styles.dayLabel}>
                        {item.day}
                      </Text>
                  ))
              ) : (
                  ["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => (
                      <Text key={`mock-day-${index}`} style={styles.dayLabel}>{day}</Text>
                  ))
              )}
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
                      if (action.key === "caregiver") onNavigate("caregiver");
                      if (action.key === "pharmacy") onNavigate("pharmacy");
                      if (action.key === "dispenser") onNavigate("dispenser");
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
    paddingHorizontal: 10,
  },
  heroTime: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
  },
  heroMedication: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  grid: { gap: 16 },
  statusHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  stablePill: { backgroundColor: colors.secondarySoft, color: colors.secondary, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  metaLabel: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700" },
  cardTitle: { color: colors.text, fontSize: 24, fontWeight: "800" },
  cardBody: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  chartRow: { height: 110, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bar: { flex: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  barIdle: { backgroundColor: colors.primarySoft },
  barActive: { backgroundColor: colors.primary },
  daysRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  dayLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  sectionBlock: { gap: 16 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: { width: "47%", backgroundColor: colors.surfaceLowest, borderRadius: radius.lg, paddingVertical: 18, paddingHorizontal: 12, alignItems: "center", gap: 10 },
  actionIconWrap: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.tertiarySoft, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: colors.text, fontSize: 13, fontWeight: "700", textAlign: "center" },
});