import React, { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppShell } from "./src/AppShell";
import { LoginScreen } from "./src/screens/LoginScreen";
import { CreateAccountScreen } from "./src/screens/CreateAccount";
import { SafeAreaView } from "react-native-safe-area-context";


type Screen = "login" | "createAccount" | "app";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");

  const renderScreen = () => {
    switch (screen) {
      case "login":
        return (
          <SafeAreaProvider>
          <LoginScreen 
            onLogin={() => setScreen("app")}
            onNavigateToSignUp={() => setScreen("createAccount")}
          />
          </SafeAreaProvider>
        );
      case "createAccount":
        return (
          <SafeAreaProvider>
          <CreateAccountScreen 
            onNavigate={(tab) => {
              if (tab === "home") {
                setScreen("app");
              }
            }}
            onNavigateToLogin={() => setScreen("login")}
          />
          </SafeAreaProvider>
        );
      case "app":
        return <AppShell onLogout={() => setScreen("login")} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {renderScreen()}
    </SafeAreaProvider>
  );
}
