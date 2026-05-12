import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  AppScreen,
  GradientButton,
  InputField,
  SurfaceCard,
} from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import { Feather } from "@expo/vector-icons";

import {
  addCaregiver as apiAddCaregiver,
  getCaregivers as getCaregivers,
  removeCaregiver as apiRemoveCaregiver,
} from "../services/api";
import * as SecureStore from 'expo-secure-store';

async function getStoredToken() {
  const token = await SecureStore.getItemAsync("userToken");
  console.log("Token recuperado do cofre:", token);
  return token;

}
export interface Caregiver {
  id: string;
  name: string;
  email: string;
  Tel: string | null;
}

export function CaregiverScreen() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Carrega os dados (Correto)
  useEffect(() => {
    async function loadData() {
      try {
        const token = await getStoredToken();
        const data = await getCaregivers(token); // Passe o token se necessário
        setCaregivers(data);
      } catch (error) {
        console.error("Falha ao carregar cuidadores:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Funções de Manipulação (Corretas)
  const handleAddCaregiver = async (name: string, email: string, tel: string) => {
    try {
      const token = await getStoredToken();
      if (!token) throw new Error("Sessão expirada.");
      const newCaregiver = await apiAddCaregiver(token, name, email, tel);
      setCaregivers((prev) => [...prev, newCaregiver]);
      setIsAdding(false);
      Alert.alert("Sucesso", "Cuidador vinculado!");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao vincular.");
    }
  };

  const handleRemoveCaregiver = async (id: string) => {
    try {
      const token = await getStoredToken();
      if (!token) return;
      await apiRemoveCaregiver(token, id);
      setCaregivers((prev) => prev.filter((c) => c.id !== id));
      Alert.alert("Sucesso", "Cuidador removido.");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível remover.");
    }
  };

  // --- LÓGICA DE RENDERIZAÇÃO (DENTRO DA FUNÇÃO) ---

  // Primeiro: Verificamos se está carregando
  if (isLoading) {
    return (
        <AppScreen useScrollView={false}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando cuidadores...</Text>
          </View>
        </AppScreen>
    );
  }

  // Segundo: Verificamos se o usuário clicou em "Adicionar"
  if (isAdding) {
    return (
        <AddCaregiverForm
            onAdd={handleAddCaregiver}
            onCancel={() => setIsAdding(false)}
        />
    );
  }

  // Terceiro: Se a lista estiver vazia
  if (caregivers.length === 0) {
    return <EmptyState onAdd={() => setIsAdding(true)} />;
  }

  // Quarto: Renderiza a lista normal
  return (
      <CaregiverList
          caregivers={caregivers}
          onAdd={() => setIsAdding(true)}
          onRemove={handleRemoveCaregiver}
      />
  );
}

// --- Componentes de UI (sem alterações na lógica) ---

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <AppScreen useScrollView={false}>
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Feather name="users" size={48} color={colors.primary} />
        </View>
        <Text style={styles.pageTitle}>Nenhum cuidador adicionado</Text>
        <Text style={styles.pageSubtitle}>
          Compartilhe o acompanhamento com um familiar ou amigo de confiança.
        </Text>
        <View style={{ marginTop: 24, width: "100%" }}>
          <GradientButton title="Adicionar Cuidador" onPress={onAdd} />
        </View>
      </View>
    </AppScreen>
  );
}

function CaregiverList({
  caregivers,
  onAdd,
  onRemove,
}: {
  caregivers: Caregiver[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <AppScreen>
      <View style={styles.headerCopy}>
        <Text style={styles.pageTitle}>Cuidadores</Text>
        <Text style={styles.pageSubtitle}>
          Pessoas que podem acompanhar seu tratamento.
        </Text>
      </View>

      <View style={styles.listContainer}>
        {caregivers.map((caregiver) => (
          <SurfaceCard key={caregiver.id}>
            <View style={styles.caregiverItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.caregiverName}>{caregiver.name}</Text>
                <Text style={styles.caregiverEmail}>{caregiver.email}</Text>
                <Text style={styles.caregiverTel}>{caregiver.Tel ?? ""}</Text>
              </View>
              <Pressable
                onPress={() => onRemove(caregiver.id)}
                style={styles.removeButton}
              >
                <Feather name="x" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          </SurfaceCard>
        ))}
      </View>

      <GradientButton title="Adicionar Novo Cuidador" onPress={onAdd} />
    </AppScreen>
  );
}

function AddCaregiverForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, email: string, tel: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");

  const emailRef = useRef<TextInput>(null);
  const telRef = useRef<TextInput>(null);

  const handleAdd = () => {
    if (name.trim() && email.trim()) {
      onAdd(name.trim(), email.trim(), tel.trim());
    }
  };

  return (
    <AppScreen>
      <View style={styles.headerCopy}>
        <Text style={styles.pageTitle}>Adicionar Cuidador</Text>
        <Text style={styles.pageSubtitle}>
          Preencha os dados abaixo para convidar.
        </Text>
      </View>

      <SurfaceCard>
        <View style={styles.form}>
          <InputField
            label="Nome completo"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            blurOnSubmit={false}
          />
          <InputField
            ref={emailRef}
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => telRef.current?.focus()}
            blurOnSubmit={false}
          />
          <InputField
            ref={telRef}
            label="Telefone"
            value={tel}
            onChangeText={setTel}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
        </View>
      </SurfaceCard>

      <View style={styles.formActions}>
        <GradientButton title="Cancelar" variant="danger" onPress={onCancel} />
        <GradientButton title="Salvar Cuidador" onPress={handleAdd} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  headerCopy: {
    gap: 8,
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    gap: 16,
    marginBottom: 24,
  },
  caregiverItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  caregiverEmail: {
    fontSize: 14,
    color: colors.textMuted,
  },
  caregiverTel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  removeButton: {
    padding: 8,
  },
  form: {
    gap: 20,
  },
  formActions: {
    marginTop: 24,
    gap: 12,
  },
});
