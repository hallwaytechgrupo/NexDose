import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AppScreen,
  GradientButton,
  InputField,
  SurfaceCard,
  ToggleRow,
} from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import { Feather } from "@expo/vector-icons";

import {
  addCaregiver as apiAddCaregiver,
  getCaregivers as getCaregivers,
  removeCaregiver as apiRemoveCaregiver,
} from "../services/api";

export interface Caregiver {
  id: number;
  name: string;
  email: string;
  can_edit_medications?: boolean;
}

export function CaregiverScreen({
  token,
  dispenserId,
}: {
  token: string;
  dispenserId: number | null;
}) {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Carrega os dados (Correto)
  useEffect(() => {
    async function loadData() {
      try {
        if (!dispenserId) {
          setCaregivers([]);
          return;
        }
        const data = await getCaregivers(token, dispenserId);
        setCaregivers(data);
      } catch (error) {
        console.error("Falha ao carregar cuidadores:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [token, dispenserId]);

  // 2. Funções de Manipulação (Corretas)
  const handleAddCaregiver = async (email: string, canEditMedications: boolean) => {
    if (!dispenserId) {
      Alert.alert("Selecione um dispositivo", "Vá em Dispositivos e selecione um dispenser para continuar.");
      return;
    }

    try {
      const newCaregiver = await apiAddCaregiver(token, {
        dispenserId,
        caregiverEmail: email,
        canEditMedications,
      });
      setCaregivers((prev) => [...prev, newCaregiver]);
      setIsAdding(false);
      Alert.alert("Sucesso", "Cuidador vinculado!");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao vincular.");
    }
  };

  const handleRemoveCaregiver = async (id: number) => {
    if (!dispenserId) {
      Alert.alert("Selecione um dispositivo", "Vá em Dispositivos e selecione um dispenser para continuar.");
      return;
    }

    try {
      await apiRemoveCaregiver(token, id, dispenserId);
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

  if (!dispenserId) {
    return (
      <AppScreen useScrollView={false}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Feather name="package" size={48} color={colors.primary} />
          </View>
          <Text style={styles.pageTitle}>Selecione um dispositivo</Text>
          <Text style={styles.pageSubtitle}>
            Vá em Dispositivos e escolha um dispenser para gerenciar cuidadores.
          </Text>
        </View>
      </AppScreen>
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
  onRemove: (id: number) => void;
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
                <Text style={styles.caregiverTel}>
                  {caregiver.can_edit_medications ? "Pode editar medicamentos" : "Somente leitura"}
                </Text>
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
  onAdd: (email: string, canEditMedications: boolean) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [canEditMedications, setCanEditMedications] = useState(false);

  const handleAdd = () => {
    if (email.trim()) {
      onAdd(email.trim(), canEditMedications);
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
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <ToggleRow
            icon="edit-3"
            title="Pode editar medicamentos"
            subtitle="Permite criar/alterar/remover medicamentos deste dispositivo."
            value={canEditMedications}
            onValueChange={setCanEditMedications}
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
