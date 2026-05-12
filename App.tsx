import React, { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppShell } from "./src/AppShell";
import { CreateAccountScreen } from "./src/screens/CreateAccount";
import { LoginScreen } from "./src/screens/LoginScreen";
import {
  AuthUser,
  UpdateProfileResponse,
  login,
  register,
  updateProfile,
} from "./src/services/api";
import * as SecureStore from "expo-secure-store";

type Screen = "login" | "createAccount" | "app";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    const response = await login({ email, password });
    setAuthUser(response.user);
    setToken(response.token);
    await SecureStore.setItemAsync("userToken", response.token);
    setScreen("app");
  };

  const handleRegister = async (payload: {
    name: string;
    email: string;
    password: string;
    role: "responsavel" | "caregiver";
  }) => {
    await register(payload);
    await handleLogin(payload.email, payload.password);
  };

  const handleProfileUpdate = async (payload: {
    name: string;
    email: string;
    password?: string;
  }) => {
    if (!token) {
      throw new Error("Sessao expirada. Faca login novamente.");
    }

    const response = await updateProfile(token, payload);
    setAuthUser(response.user);
    return response;
  };

  const handleLogout = () => {
    setAuthUser(null);
    setToken(null);
    SecureStore.deleteItemAsync("userToken").catch(() => null);
    setScreen("login");
  };

  const renderScreen = () => {
    switch (screen) {
      case "login":
        return (
          <LoginScreen
            onLogin={handleLogin}
            onNavigateToSignUp={() => setScreen("createAccount")}
          />
        );
      case "createAccount":
        return (
          <CreateAccountScreen
            onRegister={handleRegister}
            onNavigateToLogin={() => setScreen("login")}
          />
        );
      case "app":
        return authUser && token ? (
          <AppShell
            onLogout={handleLogout}
            onProfileUpdate={handleProfileUpdate}
            token={token}
            user={authUser}
          />
        ) : null;
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
