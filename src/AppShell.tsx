import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { HomeScreen } from "./screens/HomeScreen";
import { Feather } from "@expo/vector-icons";
import { RegisterMedicationScreen } from "./screens/RegisterMedicationScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TabKey } from "./data/mockData";
import { colors, radius, shadow } from "./theme/tokens";

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <TopBar activeTab={activeTab} />
        <View style={styles.body}>
          {activeTab === "home" && <HomeScreen onNavigate={setActiveTab} />}
          {activeTab === "medications" && (
            <RegisterMedicationScreen onNavigate={setActiveTab} />
          )}
          {activeTab === "history" && <HistoryScreen />}
          {activeTab === "settings" && <SettingsScreen />}
        </View>
        <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

function TopBar({ activeTab }: { activeTab: TabKey }) {
  const isSettings = activeTab === "settings";

  return (
    <View style={styles.topBar}>
      <Pressable style={styles.profileBlock}>
        <View style={styles.avatar}>
          <Feather
            name={isSettings ? "arrow-left" : "user"}
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.topTitle}>
            {isSettings ? "Configuracoes" : "Ola, Marck"}
          </Text>
          {!isSettings && (
            <View style={styles.statusRow}>
              <Text style={styles.statusPill}>Dispenser online</Text>
              <Feather name="wifi" size={12} color={colors.secondary} />
            </View>
          )}
        </View>
      </Pressable>
      <View style={styles.topActions}>
        <Feather name="bell" size={24} color={colors.textMuted} />
        <Feather name="settings" size={24} color={colors.textMuted} />
      </View>
    </View>
  );
}

function BottomTabs({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const items: Array<{ key: TabKey; label: string; icon: React.ComponentProps<typeof Feather>['name'] }> = [
    { key: "home", label: "Inicio", icon: "home" },
    { key: "medications", label: "Medicamentos", icon: "plus-square" },
    { key: "history", label: "Historico", icon: "archive" },
    { key: "settings", label: "Ajustes", icon: "settings" },
  ];

  return (
    <View style={[styles.bottomTabs, shadow.card]}>
      {items.map((item) => {
        const active = item.key === activeTab;
        const content = (
          <>
            <Feather name={item.icon} size={24} color={active ? "white" : colors.text} />
            <Text style={[styles.tabLabel, active && styles.tabTextActive]}>
              {item.label}
            </Text>
          </>
        );

        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)}>
            {active ? (
              <LinearGradient
                colors={[colors.primary, colors.primaryBright]}
                style={styles.activeTab}
              >
                {content}
              </LinearGradient>
            ) : (
              <View style={styles.idleTab}>{content}</View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(248,250,251,0.9)",
  },
  profileBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  profileCopy: {
    gap: 4,
  },
  topTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    backgroundColor: "rgba(111,251,133,0.32)",
    color: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statusWifi: {
    color: colors.secondary,
    fontSize: 12,
  },
  topActions: {
    flexDirection: "row",
    gap: 12,
  },
  topAction: {
    color: colors.textMuted,
    fontSize: 18,
  },
  bottomTabs: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.lg,
    padding: 8,
  },
  idleTab: {
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 76,
  },
  activeTab: {
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 76,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  tabTextActive: {
    color: "white",
    fontWeight: "800",
  },
});
