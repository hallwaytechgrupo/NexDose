import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AppScreen,
  GradientButton,
  InputField,
  SurfaceCard,
} from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import { Feather } from "@expo/vector-icons";

// Type for a caregiver object
interface Caregiver {
  id: string;
  name: string;
  email: string;
}

// --- Main Screen Component ---
export function CaregiverScreen() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const addCaregiver = (name: string, email: string) => {
    const newCaregiver = { id: Date.now().toString(), name, email };
    setCaregivers([...caregivers, newCaregiver]);
    setIsAdding(false);
  };

  const removeCaregiver = (id: string) => {
    setCaregivers(caregivers.filter((c) => c.id !== id));
  };

  // If "Add" form is active, show only the form
  if (isAdding) {
    return (
      <AddCaregiverForm
        onAdd={addCaregiver}
        onCancel={() => setIsAdding(false)}
      />
    );
  }

  // If no caregivers, show empty state
  if (caregivers.length === 0) {
    return <EmptyState onAdd={() => setIsAdding(true)} />;
  }

  // Otherwise, show the list of caregivers
  return (
    <CaregiverList
      caregivers={caregivers}
      onAdd={() => setIsAdding(true)}
      onRemove={removeCaregiver}
    />
  );
}

// --- Child Components ---

// 1. Empty State Component
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <AppScreen>
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Feather name="users" size={48} color={colors.primary} />
        </View>
        <Text style={styles.pageTitle}>Nenhum cuidador adicionado</Text>
        <Text style={styles.pageSubtitle}>
          Compartilhe o acompanhamento com um familiar ou amigo de confiança.
        </Text>
        <View style={{ marginTop: 24, width: '100%' }}>
          <GradientButton title="Adicionar Cuidador" onPress={onAdd} />
        </View>
      </View>
    </AppScreen>
  );
}

// 2. Caregiver List Component
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
              <View>
                <Text style={styles.caregiverName}>{caregiver.name}</Text>
                <Text style={styles.caregiverEmail}>{caregiver.email}</Text>
              </View>
              <Pressable onPress={() => onRemove(caregiver.id)} style={styles.removeButton}>
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

// 3. Add Caregiver Form Component
function AddCaregiverForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, email: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleAdd = () => {
    if (name && email) {
      onAdd(name, email);
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
          <InputField label="Nome completo" value={name} onChangeText={setName} />
          <InputField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
        </View>
      </SurfaceCard>

      <View style={styles.formActions}>
        <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
        </Pressable>
        <GradientButton title="Salvar Cuidador" onPress={handleAdd} />
      </View>
    </AppScreen>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
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
  // Empty State Styles
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
  // List Styles
  listContainer: {
    gap: 16,
    marginBottom: 24,
  },
  caregiverItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  removeButton: {
    padding: 8,
  },
  // Form Styles
  form: {
    gap: 20,
  },
  formActions: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 18,
    alignItems: "center",
    borderRadius: radius.lg,
  },
  cancelButton: {
      backgroundColor: '#F3F4F6'
  },
  cancelButtonText: {
      color: colors.textMuted,
      fontWeight: 'bold',
      fontSize: 16
  }
});     
