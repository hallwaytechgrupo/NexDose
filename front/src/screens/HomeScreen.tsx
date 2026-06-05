import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator, Animated, Easing } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { quickActions, TabKey } from "../data/mockData";
import {
  AppScreen,
  GlassCard,
  SectionTitle,
  SurfaceCard,
} from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import { Feather } from "@expo/vector-icons";
import { getMedications } from "../services/api";

interface HomeScreenProps {
  token: string;
  dispenserId: number | null;
  onNavigate: (tab: TabKey) => void;
}

type MedicationSchedule = {
  name?: string;
  dosage?: string;
  interval?: number | string;
  interval_hours?: number | string;
  nextDose?: string;
  start_time?: string;
  startTime?: string;
  scheduleStartAt?: string;
  schedule_start_at?: string;
  endDate?: string | null;
  end_date?: string | null;
  isContinuous?: boolean;
  is_continuous?: boolean;
};

type WeekScheduleDay = {
  label: string;
  count: number;
  isToday: boolean;
};

const WEEK_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];
const MIN_BAR_HEIGHT = 24;
const MAX_BAR_HEIGHT = 110;

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getDoseDateFromTime(time: string, baseDate: Date): Date | null {
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr) || 0;

  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;

  const doseDate = new Date(baseDate);
  doseDate.setHours(hour, minute, 0, 0);
  return doseDate;
}

function buildWeeklySchedule(medications: MedicationSchedule[], now = new Date()): WeekScheduleDay[] {
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const todayIndex = Math.floor((new Date(now).setHours(0, 0, 0, 0) - weekStart.getTime()) / (24 * 60 * 60 * 1000));
  const counts = Array.from({ length: 7 }, () => 0);

  medications.forEach((med) => {
    const nextDoseStr = med.nextDose || med.start_time || med.startTime;
    const scheduleStartValue = med.scheduleStartAt || med.schedule_start_at;
    const intervalHours = Number(med.interval || med.interval_hours) || 8;
    const endDateValue = med.endDate || med.end_date;
    const isContinuous = med.isContinuous ?? med.is_continuous ?? true;

    if (!nextDoseStr || nextDoseStr === "--:--" || nextDoseStr.includes("NaN") || intervalHours <= 0) return;

    const endDate = endDateValue ? new Date(endDateValue) : null;
    if (!isContinuous && endDate && endDate < weekStart) return;

    let cursor: Date | null;
    if (nextDoseStr.includes("T") || nextDoseStr.includes("-")) {
      const parsed = new Date(nextDoseStr);
      cursor = Number.isNaN(parsed.getTime()) ? null : parsed;
    } else if (scheduleStartValue) {
      const parsedStart = new Date(scheduleStartValue);
      cursor = Number.isNaN(parsedStart.getTime()) ? null : parsedStart;
    } else {
      cursor = getDoseDateFromTime(nextDoseStr, weekStart);
      if (cursor) cursor.setDate(cursor.getDate() - 1);
    }

    if (!cursor) return;

    while (cursor < weekStart) {
      cursor.setHours(cursor.getHours() + intervalHours);
    }

    while (cursor < weekEnd) {
      if (!endDate || cursor <= endDate || isContinuous) {
        const dayIndex = Math.floor((cursor.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex >= 0 && dayIndex < 7) counts[dayIndex] += 1;
      }
      cursor.setHours(cursor.getHours() + intervalHours);
    }
  });

  return counts.map((count, index) => ({
    label: WEEK_LABELS[index],
    count,
    isToday: index === todayIndex,
  }));
}

export function HomeScreen({ token, dispenserId, onNavigate }: HomeScreenProps) {
  // 1. ESTADO DE UI (Mantido! Controla apenas o visual)
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 2. A FERRARI (React Query assumindo Rede, Cache e o Cronômetro)
  const { data, isLoading } = useQuery({
    // A chave do cache. Se o dispenserId mudar, ele refaz a busca sozinho.
    queryKey: ['nextMedication', dispenserId],

    // Só executa se o ID do dispenser existir (substitui aquele seu IF inicial)
    enabled: !!dispenserId && !!token,

    // RECURSO DE OURO: Substitui o seu setInterval!
    // Refaz a função silenciosamente a cada 60.000ms (1 minuto) para atualizar o relógio
    refetchInterval: 60000,

    queryFn: async () => {
      console.log("➔ DISPARANDO API: Chamando getMedications via React Query...");
      const meds = await getMedications(token, dispenserId!);
      const weeklySchedule = buildWeeklySchedule(meds as MedicationSchedule[]);
      const todayScheduleCount = weeklySchedule.find((day) => day.isToday)?.count ?? 0;

      if (!meds || !Array.isArray(meds) || meds.length === 0) {
        return { nextMed: null, countdown: "--:--", weeklySchedule, todayScheduleCount };
      }

      // --- O seu cálculo matemático exato continua aqui dentro ---
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

      return {
        nextMed: absoluteClosestMed,
        countdown: calculatedCountdown,
        weeklySchedule,
        todayScheduleCount,
      };
    }
  });

  // Variáveis de fácil acesso derivadas do React Query
  const nextMed = data?.nextMed;
  const countdown = data?.countdown || "--:--h";
  const weeklySchedule = data?.weeklySchedule ?? buildWeeklySchedule([]);
  const maxScheduleCount = Math.max(...weeklySchedule.map((item) => item.count), 1);

  // 3. EFEITO VISUAL (Mantido! Reage ao dado que veio do React Query)
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
                {isLoading ? (
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

        {/* ... Resto da grade de Status e Aderência continua exatamente igual ... */}
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
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Agendamentos da semana</Text>
                <Text style={styles.chartSubtitle}>
                  Hoje: {data?.todayScheduleCount ?? 0} horarios
                </Text>
              </View>
              <Feather name="calendar" size={24} color={colors.primary} />
            </View>
            <View style={styles.chartRow}>
              {weeklySchedule.map((day, index) => {
                const height = day.count === 0
                  ? MIN_BAR_HEIGHT
                  : MIN_BAR_HEIGHT + (day.count / maxScheduleCount) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);

                return (
                  <View
                      key={`${day.label}-${index}`}
                      style={[
                        styles.bar,
                        { height },
                        day.isToday ? styles.barActive : styles.barIdle,
                        day.count === 0 ? styles.barEmpty : undefined,
                      ]}
                  >
                    <Text style={[styles.barValue, day.isToday ? styles.barValueActive : undefined]}>
                      {day.count}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.daysRow}>
              {weeklySchedule.map((day, index) => (
                  <Text
                      key={`${day.label}-${index}`}
                      style={[styles.dayLabel, day.isToday ? styles.dayLabelActive : undefined]}
                  >
                    {day.label}
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
  chartSubtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 4 },
  chartRow: { height: 110, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bar: { flex: 1, minHeight: MIN_BAR_HEIGHT, borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: "center", justifyContent: "flex-start", paddingTop: 6 },
  barIdle: { backgroundColor: colors.primarySoft },
  barActive: { backgroundColor: colors.primary },
  barEmpty: { opacity: 0.45 },
  barValue: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  barValueActive: { color: colors.white },
  daysRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  dayLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  dayLabelActive: { color: colors.primary, fontSize: 12 },
  sectionBlock: { gap: 16 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: { width: "47%", backgroundColor: colors.surfaceLowest, borderRadius: radius.lg, paddingVertical: 18, paddingHorizontal: 12, alignItems: "center", gap: 10 },
  actionIconWrap: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.tertiarySoft, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: colors.text, fontSize: 13, fontWeight: "700", textAlign: "center" },
});
