import React, { useMemo } from "react";
import { StyleSheet, Text, View, ActivityIndicator, FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppScreen, SectionTitle } from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import { Feather } from "@expo/vector-icons";
import { getHistory, HistoryItem } from "../services/api";

type HistoryScreenProps = {
  token: string;
  dispenserId: number | null;
};

// Helper para formatar hora de forma segura
function formatTime(scheduledAt: string | null): string {
  if (!scheduledAt) return 'Horário indisponível';
  
  try {
    const safeDateString = String(scheduledAt).replace(' ', 'T');
    const date = new Date(safeDateString);
    
    if (isNaN(date.getTime())) {
      return 'Horário indisponível';
    }
    
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Horário indisponível';
  }
}

// Helper para obter configurações de status
function getStatusConfig(status: string) {
  const configs: Record<string, any> = {
    taken_on_time: {
      iconName: "check",
      iconColor: colors.secondary,
      badgeText: "Tomado",
      badgeStyle: styles.doneBadge,
      iconWrapStyle: styles.historyIconWrapTaken,
      cardStyle: styles.historyTaken,
      titleStyle: styles.historyTitle,
    },
    taken_late: {
      iconName: "alert-circle",
      iconColor: "#F59E0B",
      badgeText: "Com atraso",
      badgeStyle: styles.lateBadge,
      iconWrapStyle: styles.historyIconWrapLate,
      cardStyle: styles.historyTaken,
      titleStyle: styles.historyTitle,
    },
    missed: {
      iconName: "alert-triangle",
      iconColor: colors.error,
      badgeText: "Atrasado / Não tomado",
      badgeStyle: styles.missedBadge,
      iconWrapStyle: styles.historyIconWrapMissed,
      cardStyle: styles.historyMissed,
      titleStyle: styles.historyTitleMissed,
    },
  };

  return configs[status] || {
    iconName: "clock",
    iconColor: colors.textMuted,
    badgeText: "Pendente",
    badgeStyle: styles.pendingBadge,
    iconWrapStyle: styles.historyIconWrapPending,
    cardStyle: styles.historyTaken,
    titleStyle: styles.historyTitle,
  };
}

export function HistoryScreen({ token, dispenserId }: HistoryScreenProps) {
  const {
    data: rawItems = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ['history', dispenserId],
    enabled: !!dispenserId && !!token,
    queryFn: async () => {
      return await getHistory(token, dispenserId!);
    }
  });

  // Ordenar por hora agendada (próximas primeiro)
  const historyItems = useMemo(() => {
    return [...rawItems].sort((a, b) => {
      const dateA = new Date(a.scheduledAt || 0).getTime();
      const dateB = new Date(b.scheduledAt || 0).getTime();
      return dateA - dateB;
    });
  }, [rawItems]);

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    const config = getStatusConfig(item.status);
    const time = formatTime(item.scheduledAt);

    return (
      <View style={[styles.historyCard, config.cardStyle]}>
        <View style={styles.historyCopy}>
          <View style={[styles.historyIconWrap, config.iconWrapStyle]}>
            <Feather 
              name={config.iconName as any} 
              size={20} 
              color={config.iconColor} 
            />
          </View>
          <View style={styles.historyText}>
            <Text style={config.titleStyle}>{item.medication_name}</Text>
            <Text style={styles.historySubtitle}>{time}</Text>
          </View>
        </View>
        <Text style={config.badgeStyle}>{config.badgeText}</Text>
      </View>
    );
  };

  const renderContent = () => {
    if (!dispenserId) {
      return <Text style={styles.emptyText}>Nenhum dispensador selecionado.</Text>;
    }

    if (isLoading) {
      return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
    }

    if (isError) {
      return <Text style={styles.emptyText}>Falha ao buscar histórico.</Text>;
    }

    if (historyItems.length === 0) {
      return <Text style={styles.emptyText}>Nenhum histórico encontrado para hoje.</Text>;
    }

    return (
      <FlatList
        data={historyItems}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        scrollEnabled={false}
      />
    );
  };

  return (
    <AppScreen>
      <View style={styles.block}>
        <SectionTitle>Histórico de hoje</SectionTitle>
        {renderContent()}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 16,
    flex: 1,
  },
  list: {
    gap: 12,
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: colors.textMuted,
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
  historyIconWrapLate: {
    backgroundColor: "rgba(245,158,11,0.2)",
  },
  historyIconWrapMissed: {
    backgroundColor: "rgba(186,26,26,0.12)",
  },
  historyIconWrapPending: {
    backgroundColor: "rgba(150,150,150,0.15)",
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
  historyTitleMissed: {
    color: colors.error,
    fontSize: 15,
    fontWeight: "800",
  },
  historySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  doneBadge: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: "800",
  },
  lateBadge: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "800",
  },
  missedBadge: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "800",
  },
  pendingBadge: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
});
