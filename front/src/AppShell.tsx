import React, { useEffect, useState } from "react";
import {
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { HomeScreen } from "./screens/HomeScreen";
import MedicationsScreen from "./screens/RegisterMedicationScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { CaregiverScreen } from "./screens/Caregiver";
import { PharmacyScreen } from "./screens/PharmacyScreen";
import { DispenserScreen } from "./screens/DispenserScreen";
import { UserMenuScreen } from "./screens/UserMenuScreen";
import { EditProfileScreen } from "./screens/EditProfileScreen";
import { TabKey } from "./data/mockData";
import { GradientButton, ButtonRow } from "./components/Primitives";
import { colors, radius, shadow } from "./theme/tokens";
import { AuthUser, UpdateProfileResponse, getApiBaseUrl, getDispensers, savePushToken } from "./services/api";
import { registerForPushNotificationsAsync, setupNotificationListeners } from './services/notifications';
import { HelpScreen} from "./screens/HelpScreen";

type AppScreen = TabKey | "userMenu" | "editProfile" | "loading" | "caregiver" | "pharmacy" | "dispenser" | "help";

export function AppShell({
                           onLogout,
                           onProfileUpdate,
                           user,
                           token,
                         }: {
  onLogout: () => void;
  onProfileUpdate: (payload: {
    name: string;
    email: string;
    password?: string;
    avatarUri?: string | null;
  }) => Promise<UpdateProfileResponse>;
  user: AuthUser;
  token: string;
}) {
  const [activeScreen, setActiveScreen] = useState<AppScreen>("loading");
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Estados principais
  const [dispensersList, setDispensersList] = useState<any[]>([]);
  const [selectedDispenserId, setSelectedDispenserId] = useState<number | null>(null);
  const [canEditMedications, setCanEditMedications] = useState<boolean>(false);

  // Forçando Number() para evitar que string vs number quebre a lógica de dono
  const currentDispenser = dispensersList.find(d => Number(d.id) === Number(selectedDispenserId));
  const isOwnerOfCurrentDevice = currentDispenser && Number(currentDispenser.sponsor_id) === Number(user.id);
  const dispenserName = currentDispenser?.name || "Sem Dispositivo";

  // Lógica de Inicialização Inteligente
  useEffect(() => {
    async function initializeApp() {
      try {
        // 1. Busca os dispensers
        const dispensers = await getDispensers(token);
        setDispensersList(dispensers);

        if (dispensers && dispensers.length === 1) {
          const device = dispensers[0];
          setSelectedDispenserId(device.id);

          const isOwner = Number(device.sponsor_id) === Number(user.id);
          const hasPermission = isOwner || !!device.can_edit_medications;

          setCanEditMedications(hasPermission);
          setActiveScreen("home");
        } else {
          setActiveScreen("dispenser");
        }

      } catch (error) {
        console.error("Erro ao inicializar dispositivos:", error);
        if (error instanceof Error && error.message.includes("Token invalido")) {
          onLogout();
          return;
        }
        setActiveScreen("dispenser");
      }
    }

    initializeApp();
  }, [token]);

  useEffect(() => {
    async function registerDeviceForNotifications() {
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          console.log("Token de Notificação gerado com sucesso:", pushToken);
          await savePushToken(token, pushToken);
        }
      } catch (error) {
        console.warn("Registro de notificações indisponível:", error);
      }
    }

    registerDeviceForNotifications();
    
    // Setup listeners para notificações recebidas e ações
    const unsubscribe = setupNotificationListeners();
    return unsubscribe;
  }, [token]);

  // Controle do Botão Voltar (Android)
  useEffect(() => {
    if (activeScreen === "loading") return;

    const backAction = () => {
      if (activeScreen === "editProfile") {
        setActiveScreen("userMenu");
        return true;
      }
      if (activeScreen === "userMenu") {
        setActiveScreen("home");
        return true;
      }
      if (activeScreen === "home") {
        setLogoutModalVisible(true);
        return true;
      }
      setActiveScreen("home");
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [activeScreen]);

  const handleNavigation = (screen: any) => {
    setActiveScreen(screen);
  };

  const hasTabs = ["home", "medications", "history"].includes(activeScreen);

  if (activeScreen === "loading") {
    return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Sincronizando NexDose...</Text>
        </View>
    );
  }

  return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          {["home", "medications", "history", "settings", "caregiver", "pharmacy", "dispenser"].includes(activeScreen) && (
              <TopBar
                  activeTab={activeScreen as any}
                  onBackPress={() => handleNavigation("userMenu")}
                  onNotificationPress={() => setNotificationModalVisible(true)}
                  onAvatarPress={() => handleNavigation("userMenu")}
                  user={user}
                  dispenserName={dispenserName}
              />
          )}

          <View style={[styles.body, hasTabs && styles.bodyWithTabs]}>
            {activeScreen === "home" && (
                <HomeScreen
                    onNavigate={handleNavigation}
                    token={token}
                    dispenserId={selectedDispenserId}
                />
            )}
            {activeScreen === "medications" && (
                <MedicationsScreen
                    token={token}
                    dispenserId={selectedDispenserId}
                    canEdit={canEditMedications}
                />
            )}

            {activeScreen === "history" && (
                <HistoryScreen
                    token={token}
                    dispenserId={selectedDispenserId}
                />
            )}
            {activeScreen === "settings" && (
                <SettingsScreen
                    token={token}
                    dispenserId={selectedDispenserId}
                />
            )}

            {activeScreen === "caregiver" && (
                <CaregiverScreen
                    token={token}
                    dispenserId={selectedDispenserId}
                    isOwner={!!isOwnerOfCurrentDevice}
                />
            )}

            {activeScreen === "pharmacy" && <PharmacyScreen />}

            {activeScreen === "dispenser" && (
                <DispenserScreen
                    token={token}
                    selectedDispenserId={selectedDispenserId}
                    onSelectDispenser={async (id, canEdit) => {
                      setSelectedDispenserId(id);

                      try {
                        const freshDispensers = await getDispensers(token);
                        setDispensersList(freshDispensers);

                        const selectedDevice = freshDispensers.find(d => Number(d.id) === Number(id));
                        const isOwner = selectedDevice && Number(selectedDevice.sponsor_id) === Number(user.id);

                        setCanEditMedications(!!(isOwner || canEdit));
                      } catch (err) {
                        const selectedDevice = dispensersList.find(d => Number(d.id) === Number(id));
                        const isOwner = selectedDevice && Number(selectedDevice.sponsor_id) === Number(user.id);
                        setCanEditMedications(!!(isOwner || canEdit));
                      }

                      setActiveScreen("home");
                    }}
                />
            )}

            {activeScreen === "userMenu" && (
                <UserMenuScreen onNavigate={handleNavigation} onLogout={() => setLogoutModalVisible(true)} />
            )}

            {activeScreen === "editProfile" && (
                <EditProfileScreen
                    onNavigate={handleNavigation}
                    onProfileUpdate={onProfileUpdate}
                    user={user}
                />
            )}

            {activeScreen === "help" && (
                <HelpScreen onNavigate={handleNavigation} />
            )}
          </View>

          {hasTabs && (
              <BottomTabs activeTab={activeScreen as any} onChange={handleNavigation} />
          )}
        </View>

        <NotificationModal
            visible={notificationModalVisible}
            onClose={() => setNotificationModalVisible(false)}
        />

        <LogoutModal
            visible={logoutModalVisible}
            onLogout={onLogout}
            onContinue={() => setLogoutModalVisible(false)}
        />
      </SafeAreaView>
  );
}

// --- COMPONENTES AUXILIARES ---

function TopBar({ activeTab, onBackPress, onNotificationPress, onAvatarPress, user, dispenserName }: any) {
  const isSettings = activeTab === "settings";

  // Pegando a base URL ou usando o fallback local
  const baseUrl = getApiBaseUrl();

  return (
      <View style={styles.topBar}>
        <Pressable style={styles.profileBlock} onPress={isSettings ? onBackPress : onAvatarPress}>
          <View style={styles.avatar}>
            {isSettings ? (
                <Feather name="arrow-left" size={20} color={colors.primary} />
            ) : user?.avatar_url ? (
                <Image
                    source={{ uri: `${baseUrl}${user.avatar_url}` }}
                    style={{ width: "100%", height: "100%", borderRadius: 100 }}
                />
            ) : (
                <Feather name="user" size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.topTitle}>{isSettings ? "Configurações" : `Olá, ${user?.name}!`}</Text>
            {!isSettings && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusPill}>{`Dispositivo: ${dispenserName}`}</Text>
                  <Feather name="wifi" size={12} color={colors.secondary} />
                </View>
            )}
          </View>
        </Pressable>
        <View style={styles.topActions}>
          <Pressable onPress={onNotificationPress}>
            <Feather name="bell" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
  );
}

function BottomTabs({ activeTab, onChange }: any) {
  const items: Array<{ key: string; label: string; icon: any }> = [
    { key: "home", label: "Início", icon: "home" },
    { key: "medications", label: "Medicamentos", icon: "plus-square" },
    { key: "history", label: "Histórico", icon: "archive" },
  ];

  return (
      <View style={[styles.bottomTabs, shadow.card]}>
        {items.map((item) => {
          const active = item.key === activeTab;
          return (
              <Pressable key={item.key} onPress={() => onChange(item.key as any)}>
                {active ? (
                    <LinearGradient colors={[colors.primary, colors.primaryBright]} style={styles.activeTab}>
                      <Feather name={item.icon} size={24} color="white" />
                      <Text style={[styles.tabLabel, styles.tabTextActive]}>{item.label}</Text>
                    </LinearGradient>
                ) : (
                    <View style={styles.idleTab}>
                      <Feather name={item.icon} size={24} color={colors.text} />
                      <Text style={styles.tabLabel}>{item.label}</Text>
                    </View>
                )}
              </Pressable>
          );
        })}
      </View>
  );
}

function NotificationModal({ visible, onClose }: any) {
  return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.notificationModalContainer} onPress={onClose}>
          <View style={styles.notificationModal}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>Notificações</Text>
              <Pressable onPress={onClose}><Feather name="x" size={24} color={colors.text} /></Pressable>
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationEmpty}>Nenhuma notificação no momento</Text>
            </View>
          </View>
        </Pressable>
      </Modal>
  );
}

function LogoutModal({ visible, onLogout, onContinue }: any) {
  return (
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={onContinue}>
          <View style={styles.logoutModal}>
            <Text style={styles.logoutTitle}>Sair do app?</Text>
            <Text style={styles.logoutMessage}>Tem certeza que deseja sair?</Text>

            {/* Trocamos o ButtonRow por uma View em coluna com um espaçamento de 12px */}
            <View style={{ flexDirection: 'column', gap: 12 }}>
              <GradientButton title="Cancelar" onPress={onContinue} />
              <GradientButton title="Sair" onPress={onLogout} variant="danger" />
            </View>

          </View>
        </Pressable>
      </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  loadingText: { marginTop: 12, color: colors.textMuted, fontWeight: "600" },
  body: { flex: 1 },
  bodyWithTabs: { paddingBottom: 110 },
  topBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(248,250,251,0.9)" },
  profileBlock: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  profileCopy: { gap: 4 },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusPill: { backgroundColor: "rgba(111,251,133,0.32)", color: colors.secondary, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 2, fontSize: 11, fontWeight: "800" },
  topActions: { flexDirection: "row", gap: 12 },
  bottomTabs: { position: "absolute", left: 16, right: 16, bottom: 16, flexDirection: "row", justifyContent: "space-around", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: radius.lg, padding: 8 },
  idleTab: { borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 4, minWidth: 76 },
  activeTab: { borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 4, minWidth: 76 },
  tabLabel: { fontSize: 12, fontWeight: "600", color: colors.text },
  tabTextActive: { color: "white", fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", paddingHorizontal: 16 },
  notificationModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  notificationModal: {
    position: "absolute",
    top: 90,
    right: 20,
    width: 300,
    backgroundColor: "white",
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow.card,
  },
  notificationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  notificationTitle: { fontSize: 18, fontWeight: "800" },
  notificationContent: { padding: 16 },
  notificationEmpty: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  logoutModal: { backgroundColor: "white", borderRadius: radius.lg, padding: 24, width: "85%", alignSelf: "center" },
  logoutTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  logoutMessage: { fontSize: 14, color: colors.textMuted, marginBottom: 24 },
});
