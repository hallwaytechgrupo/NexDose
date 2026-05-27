import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppShell } from "./src/AppShell";
import { CreateAccountScreen } from "./src/screens/CreateAccount";
import { LoginScreen } from "./src/screens/LoginScreen";
import {
  AuthUser,
  login,
  register,
  updateProfile,
} from "./src/services/api";
import * as SecureStore from "expo-secure-store";
import { initializeApp } from "firebase/app";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


type Screen = "login" | "createAccount" | "app";

const queryClient = new QueryClient();


export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await SecureStore.getItemAsync("userToken");
        const storedUser = await SecureStore.getItemAsync("authUser");

        if (!storedToken || !storedUser) return;

        const parsedUser = JSON.parse(storedUser) as AuthUser;
        setToken(storedToken);
        setAuthUser(parsedUser);
        setScreen("app");
      } catch (_err) {
        // ignore: start at login
      }
    }

    restoreSession();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await login({ email, password });
      setAuthUser(response.user);
      setToken(response.token);

      // Salva token e role para persistência
      await SecureStore.setItemAsync("userToken", response.token);
      await SecureStore.setItemAsync("authUser", JSON.stringify(response.user));
      if (response.user.role) {
        await SecureStore.setItemAsync("userRole", response.user.role);
      }

      setScreen("app");
    } catch (error) {
      throw error;
    }
  };

  // ✅ CORREÇÃO AQUI: Removida a role e adicionado o phone
  const handleRegister = async (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    try {
      await register(payload);
      // Após registrar, faz login automático
      await handleLogin(payload.email, payload.password);
    } catch (error) {
      throw error;
    }
  };

  const handleProfileUpdate = async (payload: {
    name: string;
    email: string;
    password?: string;
    avatarUri?: string | null;
  }) => {
    if (!token) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const response = await updateProfile(token, payload);
    setAuthUser(response.user);
    await SecureStore.setItemAsync("authUser", JSON.stringify(response.user));
    return response;
  };

  const handleLogout = () => {
    setAuthUser(null);
    setToken(null);
    SecureStore.deleteItemAsync("userToken").catch(() => null);
    SecureStore.deleteItemAsync("authUser").catch(() => null);
    SecureStore.deleteItemAsync("userRole").catch(() => null);
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
                onRegister={handleRegister} // Agora passa a função correta
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
        {/* Adicione o Provider abraçando o renderScreen */}
        <QueryClientProvider client={queryClient}>
          {renderScreen()}
        </QueryClientProvider>
      </SafeAreaProvider>
  );
}
