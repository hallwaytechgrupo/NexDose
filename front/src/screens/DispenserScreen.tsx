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
  can_edit_medications: boolean; // Novo campo vindo do backend
};

export function DispenserScreen({
                                  token,
                                  selectedDispenserId,
                                  onSelectDispenser,
                                }: {
  token: string;
  selectedDispenserId: number | null;
  onSelectDispenser: (id: number | null, canEdit: boolean) => void; // Assinatura atualizada
}) {
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const load = async () => {
    try {
      setIsLoading(true);
      const data = await getDispensers(token);
      setDispensers(data);

      // Se houver dispositivos e nenhum selecionado, seleciona o primeiro e passa sua permissão
      if (data.length > 0 && !selectedDispenserId) {
        onSelectDispenser(data[0].id, data[0].can_edit_medications);
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao carregar dispositivos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (id: number) => {
    Alert.alert(
        "Remover dispositivo",
        "Deseja desassociar este dispositivo da sua conta?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: async () => {
              try {
                await removeDispenser(token, id);
                setDispensers((prev) => {
                  const next = prev.filter((d) => d.id !== id);
                  if (selectedDispenserId === id) {
                    // Se removeu o selecionado, seleciona o próximo ou limpa
                    if (next.length > 0) {
                      onSelectDispenser(next[0].id, next[0].can_edit_medications);
                    } else {
                      onSelectDispenser(null, false);
                    }
                  }
                  return next;
                });
              } catch (e: any) {
                Alert.alert("Erro", e?.message || "Nao foi possivel remover.");
              }
            },
          },
        ]
    );
  };

  if (isLoading) {
    return (
        <AppScreen useScrollView={false}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando dispositivos...</Text>
          </View>
        </AppScreen>
    );
  }

  if (isAdding) {
    return (
        <AddDispenserForm
            token={token}
            onCancel={() => setIsAdding(false)}
            onCreated={async (created) => {
              setIsAdding(false);
              await load();
              // Dispositivo recém-criado pelo dono sempre tem can_edit = true
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
            Selecione um dispenser para filtrar medicamentos e compartilhamentos.
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
                  Adicione pelo numero de serie do dispenser.
                </Text>
              </View>
          ) : (
              dispensers.map((d) => {
                const active = selectedDispenserId === d.id;
                return (
                    <SurfaceCard key={d.id} style={active ? styles.cardActive : undefined}>
                      <Pressable
                          onPress={() => onSelectDispenser(d.id, d.can_edit_medications)}
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
                          <Feather name="trash-2" size={18} color={active ? colors.white : colors.textMuted} />
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef<TextInput>(null);

  const handleSave = async () => {
    if (!serialNumber.trim()) {
      Alert.alert("Erro", "Informe o numero de serie.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await claimDispenser(token, serialNumber.trim(), name.trim());
      // O backend retorna o objeto do dispenser
      onCreated(res);
      Alert.alert("Sucesso", "Dispositivo associado!");
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao associar dispositivo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <AppScreen>
        <View style={styles.headerCopy}>
          <Text style={styles.pageTitle}>Adicionar dispositivo</Text>
          <Text style={styles.pageSubtitle}>
            Digite o numero de serie que esta no dispenser.
          </Text>
        </View>

        <SurfaceCard muted>
          <View style={{ gap: 20 }}>
            <InputField
                label="Numero de serie"
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
          <GradientButton title="Cancelar" variant="danger" onPress={onCancel} />
          <GradientButton title={isSubmitting ? "Salvando..." : "Salvar"} onPress={handleSave} />
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