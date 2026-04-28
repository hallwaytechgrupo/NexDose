import React, { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppShell } from "./src/AppShell";
import { LoginScreen } from "./src/screens/LoginScreen";


type Screen = "login" | "app";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");

  const renderScreen = () => {
    switch (screen) {
      case "login":
        return <LoginScreen onLogin={() => setScreen("app")} />;
      case "app":
        return <AppShell />;
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
