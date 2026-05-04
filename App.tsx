import React, { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppShell } from "./src/AppShell";
import { LoginScreen } from "./src/screens/LoginScreen";
import { CreateAccountScreen } from "./src/screens/CreateAccount";



/**
 * @file App.tsx
 * @brief Ponto de entrada principal do aplicativo NexDose.
 * 
 * Este componente gerencia o estado de autenticação e renderiza a tela apropriada:
 * - Tela de Login
 * - Tela de Criação de Conta
 * - O shell principal do aplicativo (AppShell) após o login bem-sucedido.
 */

// Define os tipos de telas disponíveis para navegação no nível raiz.
type Screen = "login" | "createAccount" | "app";

export default function App() {
  // O estado 'screen' controla qual tela principal é exibida. O valor inicial é 'login'.
  const [screen, setScreen] = useState<Screen>("login");

  /**
   * Renderiza a tela correta com base no estado atual de 'screen'.
   * @returns O componente de tela a ser renderizado.
   */
  const renderScreen = () => {
    switch (screen) {
      case "login":
        return (
          <SafeAreaProvider>
          <LoginScreen 
            // Navega para o shell principal do app em caso de login bem-sucedido.
            onLogin={() => setScreen("app")}
            // Navega para a tela de criação de conta.
            onNavigateToSignUp={() => setScreen("createAccount")}
          />
          </SafeAreaProvider>
        );
      case "createAccount":
        return (
          <SafeAreaProvider>
          <CreateAccountScreen 
            // Navega para o shell principal do app se a aba for 'home'.
            onNavigate={(tab) => {
              if (tab === "home") {
                setScreen("app");
              }
            }}
            // Navega de volta para a tela de login.
            onNavigateToLogin={() => setScreen("login")}
          />
          </SafeAreaProvider>
        );
      case "app":
        // Renderiza o shell principal do aplicativo e passa a função de logout.
        return <AppShell onLogout={() => setScreen("login")} />;
      default:
        // Retorna nulo se nenhum estado de tela corresponder.
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      {/* Configura a barra de status do sistema com ícones escuros. */}
      <StatusBar style="dark" />
      {/* Renderiza a tela ativa. */}
      {renderScreen()}
    </SafeAreaProvider>
  );
}
