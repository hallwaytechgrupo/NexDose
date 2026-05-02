import React, { useState, useEffect } from "react";
import { Pressable, StyleSheet, Text, View, Modal, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { HomeScreen } from "./screens/HomeScreen";
import { Feather } from "@expo/vector-icons";
import { RegisterMedicationScreen } from "./screens/RegisterMedicationScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { CaregiverScreen } from "./screens/Caregiver";
import { PharmacyScreen } from "./screens/PharmacyScreen";
import { TabKey } from "./data/mockData";
import { colors, radius, shadow } from "./theme/tokens";
import { GradientButton, InputField } from "./components/Primitives";

export function AppShell({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [userInfoModalVisible, setUserInfoModalVisible] = useState(false);

  useEffect(() => {
    const backAction = () => {
      if (activeTab === "home") {
        setLogoutModalVisible(true);
        return true;
      } else {
        setActiveTab("home");
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [activeTab]);

  const handleBackPress = () => {
    if (activeTab !== "home") {
      setActiveTab("home");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <TopBar 
          activeTab={activeTab} 
          onSettingsPress={() => setActiveTab("settings")}
          onBackPress={handleBackPress}
          onNotificationPress={() => setNotificationModalVisible(true)}
          onAvatarPress={() => setUserInfoModalVisible(true)}
        />
        <View style={styles.body}>
          {activeTab === "home" && <HomeScreen onNavigate={setActiveTab} />}
          {activeTab === "medications" && (
            <RegisterMedicationScreen onNavigate={setActiveTab} />
          )}
          {activeTab === "history" && <HistoryScreen />}
          {activeTab === "settings" && <SettingsScreen />}
          {activeTab === "caregiver" && <CaregiverScreen />}
          {activeTab === "pharmacy" && <PharmacyScreen />}
        </View>
        <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
      </View>

      <NotificationModal 
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
      />

      <UserInfoModal
        visible={userInfoModalVisible}
        onClose={() => setUserInfoModalVisible(false)}
      />

      <LogoutModal 
        visible={logoutModalVisible}
        onLogout={onLogout}
        onContinue={() => setLogoutModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function TopBar({ 
  activeTab, 
  onSettingsPress, 
  onBackPress,
  onNotificationPress,
  onAvatarPress
}: { 
  activeTab: TabKey; 
  onSettingsPress: () => void;
  onBackPress: () => void;
  onNotificationPress: () => void;
  onAvatarPress: () => void;
}) {
  const isSettings = activeTab === "settings";

  return (
    <View style={styles.topBar}>
      <Pressable 
        style={styles.profileBlock} 
        onPress={isSettings ? onBackPress : onAvatarPress}
      >
        <View style={styles.avatar}>
          <Feather
            name={isSettings ? "arrow-left" : "user"}
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.topTitle}>
            {isSettings ? "Configuracoes" : "Ola, Maria!"}
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
        <Pressable onPress={onNotificationPress}>
          <Feather name="bell" size={24} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={onSettingsPress}>
          <Feather name="settings" size={24} color={colors.textMuted} />
        </Pressable>
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

function NotificationModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={onClose}
      >
        <View style={styles.notificationModal}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>Notificações</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationEmpty}>Nenhuma notificação no momento</Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function UserInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [name, setName] = useState("Maria Oliveira");
  const [email, setEmail] = useState("maria@email.com");

  const handleSave = () => {
    // TODO: Implement save logic
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={onClose}
      >
        <View style={styles.userInfoModal}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>Editar Perfil</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.userInfoContent}>
            <Pressable style={styles.changePhotoButton}>
              <Feather name="camera" size={16} color={colors.primary} />
              <Text style={styles.changePhotoButtonText}>Mudar foto do perfil</Text>
            </Pressable>
            <InputField label="Nome completo" value={name} onChangeText={setName} />
            <InputField label="E-mail" value={email} onChangeText={setEmail} />
            <InputField label="Nova Senha" secureTextEntry placeholder="Deixe em branco para não alterar" />
            <InputField label="Confirmar nova senha" secureTextEntry placeholder="Confirme a nova senha" />
          </View>
          <View style={styles.userInfoActions}>
            <Pressable style={[styles.modalActionButton, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.modalActionButton, styles.saveButton]} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function LogoutModal({ 
  visible, 
  onLogout, 
  onContinue 
}: { 
  visible: boolean; 
  onLogout: () => void;
  onContinue: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onContinue}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={onContinue}
      >
        <View style={styles.logoutModal}>
          <Text style={styles.logoutTitle}>Sair do app?</Text>
          <Text style={styles.logoutMessage}>Tem certeza que deseja sair?</Text>
          
          <View style={styles.logoutButtonContainer}>
            <GradientButton title="Continuar" onPress={onContinue} />
            <GradientButton title="Sair" onPress={onLogout} variant="danger" />
          </View>
        </View>
      </Pressable>
    </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  notificationModal: {
    backgroundColor: "white",
    borderRadius: radius.lg,
    overflow: "hidden",
    maxWidth: 320,
    width: "100%",
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  notificationContent: {
    padding: 16,
  },
  notificationEmpty: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
  userInfoModal: {
    backgroundColor: "white",
    borderRadius: radius.lg,
    overflow: "hidden",
    width: "95%",
    alignSelf: "center",
  },
  userInfoContent: {
    padding: 16,
    gap: 16,
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  changePhotoButtonText: {
    color: colors.primary,
    fontWeight: "700",
  },
  userInfoActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "700",
  },
  logoutModal: {
    backgroundColor: "white",
    borderRadius: radius.lg,
    padding: 24,
    width: "85%",
    alignSelf: "center",
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  logoutMessage: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
  },
  logoutButtonContainer: {
    flexDirection: "column",
    gap: 12,
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  continueButton: {
    backgroundColor: colors.primarySoft,
  },
  continueButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  exitButton: {
    backgroundColor: "#EF4444",
  },
  exitButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
});
