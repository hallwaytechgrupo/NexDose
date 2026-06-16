import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AppScreen,
  GradientButton,
  InputField,
  SurfaceCard,
} from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import { Feather } from "@expo/vector-icons";
import {
  claimDispenser,
  getDispensers,
  removeDispenser,
} from "../services/api";

type Dispenser = {
  id: number;
  serial_number: string;
  name: string | null;
  status: string | null;
  can_edit_medications?: boolean;
};

export function DispenserScreen({
                                  token,
                                  selectedDispenserId,
                                  onSelectDispenser,
                                }: {
  token: string;
  selectedDispenserId: number | null;
  onSelectDispenser: (id: number | null, canEdit: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false); // Estado de UI mantido

  // 1. A FERRARI: Busca, Cache e Monitoramento em tempo real do Hardware
  const { data: dispensers = [], isLoading } = useQuery({
    queryKey: ['dispensers'],
    enabled: !!token,
    refetchInterval: 30000, // Atualiza o status de online/bateria a cada 30 segundos silenciosamente
    queryFn: async () => {
      return await getDispensers(token);
    }
  });

  // 2. REGRA DE NEGÓCIO: Seleciona o primeiro dispositivo automaticamente se não houver nenhum selecionado
  useEffect(() => {
    if (dispensers.length > 0 && !selectedDispenserId) {
      onSelectDispenser(dispensers[0].id, !!dispensers[0].can_edit_medications);
    }
  }, [dispensers, selectedDispenserId]);

  // 3. MUTAÇÃO DE REMOÇÃO
  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      await removeDispenser(token, id);
      return id; // Retorna o ID deletado para usarmos no onSuccess
    },
    onSuccess: (deletedId) => {
      // Força a atualização da lista
      queryClient.invalidateQueries({ queryKey: ['dispensers'] });

      // Lógica para selecionar o próximo dispositivo ou limpar a tela
      const remaining = dispensers.filter((d) => d.id !== deletedId);
      if (selectedDispenserId === deletedId) {
        if (remaining.length > 0) {
          onSelectDispenser(remaining[0].id, !!remaining[0].can_edit_medications);
        } else {
          onSelectDispenser(null, false);
        }
      }
    },
    onError: (e: any) => {
      Alert.alert("Erro", e?.message || "Não foi possível remover o dispositivo.");
    }
  });

  const handleRemove = (id: number) => {
    Alert.alert(
        "Remover dispositivo",
        "Deseja desassociar este dispositivo da sua conta?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: () => removeMutation.mutate(id),
          },
        ]
    );
  };

  if (isLoading) {
    return (
        <AppScreen useScrollView={false}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Conectando aos dispositivos...</Text>
          </View>
        </AppScreen>
    );
  }

  if (isAdding) {
    return (
        <AddDispenserForm
            token={token}
            onCancel={() => setIsAdding(false)}
            onCreated={(created) => {
              setIsAdding(false);
              // Invalida a busca atual para puxar o novo aparelho e já seleciona ele
              queryClient.invalidateQueries({ queryKey: ['dispensers'] });
              onSelectDispenser(created.id, true);
            }}
        />
    );
  }

  return (
      <AppScreen>
        <View style={styles.headerCopy}>
          <Text style={styles.pageTitle}>Dispositivos</Text>
          <Text style={styles.pageSubtitle}>
            Selecione um dispositivo para filtrar medicamentos e compartilhamentos.
          </Text>
        </View>

        <View style={styles.listContainer}>
          {dispensers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Feather name="package" size={44} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Nenhum dispositivo associado</Text>
                <Text style={styles.emptySubtitle}>
                  Adicione pelo número de série do dispenser.
                </Text>
              </View>
          ) : (
              dispensers.map((d) => {
                const active = selectedDispenserId === d.id;
                return (
                    <SurfaceCard key={d.id} style={active ? styles.cardActive : undefined}>
                      <Pressable
                          onPress={() => onSelectDispenser(d.id, !!d.can_edit_medications)}
                          style={styles.row}
                      >
                        <View style={styles.iconWrap}>
                          <Feather name="package" size={18} color={active ? colors.white : colors.primary} />
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.deviceName, active ? { color: colors.white } : undefined]}>
                            {d.name || "Dispenser"}
                          </Text>
                          <Text style={[styles.deviceMeta, active ? { color: "rgba(255,255,255,0.85)" } : undefined]}>
                            Serial: {d.serial_number}
                          </Text>
                          <View style={styles.statusRow}>
                            <Text style={[styles.deviceMeta, active ? { color: "rgba(255,255,255,0.85)" } : undefined]}>
                              Status: {d.status || "offline"}
                            </Text>
                          </View>
                        </View>
                        <Pressable onPress={() => handleRemove(d.id)} style={styles.removeBtn}>
                          {removeMutation.isPending && removeMutation.variables === d.id ? (
                              <ActivityIndicator size="small" color={active ? colors.white : colors.error} />
                          ) : (
                              <Feather name="trash-2" size={18} color={active ? colors.white : colors.textMuted} />
                          )}
                        </Pressable>
                      </Pressable>
                    </SurfaceCard>
                );
              })
          )}
        </View>

        <GradientButton title="Adicionar dispositivo" onPress={() => setIsAdding(true)} />
      </AppScreen>
  );
}

// --------------------------------------------------------
// COMPONENTE DE FORMULÁRIO SEPARADO E REFATORADO
// --------------------------------------------------------
function AddDispenserForm({
                            token,
                            onCancel,
                            onCreated,
                          }: {
  token: string;
  onCancel: () => void;
  onCreated: (created: Dispenser) => void;
}) {
  const [serialNumber, setSerialNumber] = useState("");
  const [name, setName] = useState("");
  const nameRef = useRef<TextInput>(null);

  // MUTAÇÃO DE CADASTRO
  const addMutation = useMutation({
    mutationFn: async () => {
      return await claimDispenser(token, serialNumber.trim(), name.trim());
    },
    onSuccess: (res) => {
      onCreated(res);
      Alert.alert("Sucesso", "Dispositivo associado!");
    },
    onError: (e: any) => {
      Alert.alert("Erro", e?.message || "Falha ao associar dispositivo.");
    }
  });

  const handleSave = () => {
    if (!serialNumber.trim()) {
      Alert.alert("Erro", "Informe o número de série.");
      return;
    }
    addMutation.mutate();
  };

  return (
      <AppScreen>
        <View style={styles.headerCopy}>
          <Text style={styles.pageTitle}>Adicionar dispositivo</Text>
          <Text style={styles.pageSubtitle}>
            Digite o número de série que está no dispositivo.
          </Text>
        </View>

        <SurfaceCard muted>
          <View style={{ gap: 20 }}>
            <InputField
                label="Número de série"
                value={serialNumber}
                onChangeText={setSerialNumber}
                autoCapitalize="characters"
                returnKeyType="next"
                onSubmitEditing={() => nameRef.current?.focus()}
                blurOnSubmit={false}
            />
            <InputField
                ref={nameRef as any}
                label="Apelido (opcional)"
                value={name}
                onChangeText={setName}
                returnKeyType="done"
                onSubmitEditing={handleSave}
            />
          </View>
        </SurfaceCard>

        <View style={{ marginTop: 24, gap: 12 }}>
          <GradientButton title="Cancelar" variant="danger" onPress={onCancel} disabled={addMutation.isPending} />
          <GradientButton
              title={addMutation.isPending ? "Salvando..." : "Salvar"}
              onPress={handleSave}
              disabled={addMutation.isPending}
          />
        </View>
      </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: { fontSize: 16, color: colors.textMuted },
  headerCopy: { gap: 8, marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: "bold", color: colors.text },
  pageSubtitle: { fontSize: 16, color: colors.textMuted, lineHeight: 24 },
  listContainer: { gap: 16, marginBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceName: { fontSize: 16, fontWeight: "800", color: colors.text },
  deviceMeta: { fontSize: 12, color: colors.textMuted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readonlyTag: {
    fontSize: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    color: colors.textMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700'
  },
  removeBtn: { padding: 8 },
  cardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 },
  emptyIcon: {
    width: 86,
    height: 86,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 20, maxWidth: 260 },
});