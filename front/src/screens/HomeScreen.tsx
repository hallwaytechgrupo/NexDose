import React, { useState, useEffect } from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
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
import { getMedications } from "../services/api"; // ✅ Sua rota de integração

interface HomeScreenProps {
  token: string;
  dispenserId: number | null;
  onNavigate: (tab: TabKey) => void;
}

export function HomeScreen({ token, dispenserId, onNavigate }: HomeScreenProps) {
  // --- ESTADOS DA API ---
  const [nextMed, setNextMed] = useState<any>(null);
  const [countdown, setCountdown] = useState<string>("--:--h");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNextMedication();

    // ✅ Cronômetro: Atualiza o contador na tela a cada 1 minuto
    const intervalId = setInterval(() => {
      fetchNextMedication();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [token, dispenserId]);

  const fetchNextMedication = async () => {
    // 🔍 LOG 1: Descobrir se a função sequer é chamada e o que está vindo nas variáveis
    console.log("➔ 1. ESCUTOU CHAMADA: dispenserId =", dispenserId, " | token =", token ? "Preenchido" : "Vazio");

    if (!dispenserId) {
      // 🔍 LOG 2: Se parar aqui, o componente pai não está passando o ID do dispenser para a Home!
      console.log("⚠️ 2. TRAVOU NO IF: Função cancelada porque dispenserId é nulo, falso ou zero.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("➔ 3. DISPARANDO API: Chamando getMedications...");
      const data = await getMedications(token, dispenserId);

      // 🔍 LOG 3: Ver a resposta real do banco de dados
      console.log("✅ 4. BANCO DEVOLVEU DADOS:", data);

      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log("ℹ️ 5. ARRAY VAZIO: O banco respondeu, mas veio zero remédios cadastrados.");
        setNextMed(null);
        setCountdown("--:--h");
        return;
      }

      const now = new Date();
      let absoluteClosestMed: any = null;
      let minDiff = Infinity;
      let calculatedCountdown = "--:--h";

      data.forEach((med: any) => {
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
          calculatedCountdown = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}h`;
        }
      });

      console.log("🎯 6. CÁLCULO FINAL:", absoluteClosestMed, "Contador:", calculatedCountdown);
      setNextMed(absoluteClosestMed);
      setCountdown(calculatedCountdown);
    } catch (error: any) {
      // 🔍 LOG 4: Se a requisição cair por erro de rede/token, vai estourar aqui
      console.log("❌ 7. ERRO CRÍTICO NA REQUISIÇÃO:", error.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <AppScreen>
        {/* Cartão principal dinâmico do remédio */}
        <GlassCard>
          <Text style={styles.heroLabel}>Proxima dose em</Text>
          <View style={styles.ringWrap}>
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : nextMed ? (
                    <>
                      {/* ✅ Tempo Real calculado vindo do banco */}
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
            </View>
          </View>
          <GradientAction
              label="Confirmar agora"
              onPress={() => onNavigate("history")}
          />
        </GlassCard>

        {/* Grade contendo o status do dispositivo e o gráfico de aderência */}
        <View style={styles.grid}>
          {/* Cartão de status do dispositivo IoT */}
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

          {/* Cartão do gráfico de aderência semanal */}
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

        {/* Seção de acesso rápido (atalhos) */}
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
    paddingHorizontal: 10,
  },
  heroTime: {
    color: colors.text,
    fontSize: 34, // Um tiquinho menor para acomodar o "h" com segurança sem quebrar linha
    fontWeight: "900",
  },
  heroMedication: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
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