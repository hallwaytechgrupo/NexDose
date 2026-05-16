import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
    getCaregivers,
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
                                    isOwner, // ✅ Recebe se o usuário logado é o dono (Sponsor)
                                }: {
    token: string;
    dispenserId: number | null;
    isOwner: boolean;
}) {
    const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            // ✅ MATANDO O ERRO NA RAIZ: Se não for o dono, nem gasta internet chamando a API
            if (!isOwner) {
                setCaregivers([]);
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                if (!dispenserId) {
                    setCaregivers([]);
                    return;
                }
                const data = await getCaregivers(token, dispenserId);
                setCaregivers(data);
            } catch (error: any) {
                console.error("Falha ao carregar cuidadores:", error);
                setCaregivers([]);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [token, dispenserId, isOwner]);

    const handleAddCaregiver = async (email: string, canEdit: boolean) => {
        if (!isOwner) return;

        try {
            if (!dispenserId) return;

            const newCaregiver = await apiAddCaregiver(token, dispenserId, email, canEdit);

            setCaregivers((prev) => {
                const exists = prev.find(c => c.id === newCaregiver.id);
                if (exists) return prev;
                return [...prev, newCaregiver];
            });

            setIsAdding(false);
            Alert.alert("Sucesso", "Cuidador vinculado!");
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Falha ao vincular.");
        }
    };

    const handleRemoveCaregiver = async (id: number) => {
        if (!isOwner || !dispenserId) return;

        Alert.alert("Remover", "Deseja desvincular este cuidador?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Remover", style: "destructive", onPress: async () => {
                    try {
                        await apiRemoveCaregiver(token, id, dispenserId);
                        setCaregivers((prev) => prev.filter((c) => c.id !== id));
                    } catch (error) {
                        Alert.alert("Erro", "Não foi possível remover.");
                    }
                }}
        ]);
    };

    if (isLoading) {
        return (
            <AppScreen useScrollView={false}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Carregando dados...</Text>
                </View>
            </AppScreen>
        );
    }

    // ✅ SE NÃO FOR O DONO: Mostra uma tela explicativa super elegante com cadeado
    if (!isOwner) {
        return (
            <AppScreen useScrollView={false}>
                <View style={styles.emptyContainer}>
                    <View style={styles.lockIconContainer}>
                        <Feather name="lock" size={44} color={colors.primary} />
                    </View>
                    <Text style={styles.pageTitle}>Acesso Restrito</Text>
                    <Text style={styles.pageSubtitle}>
                        Apenas o **Responsável principal** do dispenser tem permissão para visualizar, convidar ou remover a equipe de cuidadores deste dispositivo.
                    </Text>
                </View>
            </AppScreen>
        );
    }

    if (isAdding && isOwner) {
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
                    <Feather name="package" size={48} color={colors.primary} />
                    <Text style={styles.pageTitle}>Dispositivo não selecionado</Text>
                </View>
            </AppScreen>
        );
    }

    if (caregivers.length === 0) {
        return <EmptyState onAdd={() => setIsAdding(true)} isOwner={isOwner} />;
    }

    return (
        <CaregiverList
            caregivers={caregivers}
            isOwner={isOwner}
            onAdd={() => setIsAdding(true)}
            onRemove={handleRemoveCaregiver}
        />
    );
}

// --- COMPONENTES AUXILIARES ---

function EmptyState({ onAdd, isOwner }: { onAdd: () => void, isOwner: boolean }) {
    return (
        <AppScreen useScrollView={false}>
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                    <Feather name="users" size={48} color={colors.primary} />
                </View>
                <Text style={styles.pageTitle}>Nenhum cuidador</Text>
                <Text style={styles.pageSubtitle}>
                    Você ainda não convidou ninguém para ajudar a monitorar este dispositivo.
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
                           isOwner,
                           onAdd,
                           onRemove,
                       }: {
    caregivers: Caregiver[];
    isOwner: boolean;
    onAdd: () => void;
    onRemove: (id: number) => void;
}) {
    return (
        <AppScreen>
            <View style={styles.headerCopy}>
                <Text style={styles.pageTitle}>Cuidadores</Text>
                <Text style={styles.pageSubtitle}>Pessoas que cuidam deste dispositivo.</Text>
            </View>

            <View style={styles.listContainer}>
                {caregivers.map((caregiver) => (
                    <SurfaceCard key={caregiver.id}>
                        <View style={styles.caregiverItem}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.caregiverName}>{caregiver.name}</Text>
                                <Text style={styles.caregiverEmail}>{caregiver.email}</Text>
                                <Text style={styles.caregiverPermission}>
                                    {caregiver.can_edit_medications ? "Pode editar medicamentos" : "Somente leitura"}
                                </Text>
                            </View>
                            <Pressable onPress={() => onRemove(caregiver.id)} style={styles.removeButton}>
                                <Feather name="trash-2" size={18} color={colors.error} />
                            </Pressable>
                        </View>
                    </SurfaceCard>
                ))}
            </View>

            <GradientButton title="Adicionar Novo Cuidador" onPress={onAdd} />
        </AppScreen>
    );
}

function AddCaregiverForm({ onAdd, onCancel }: { onAdd: (email: string, canEdit: boolean) => void; onCancel: () => void; }) {
    const [email, setEmail] = useState("");
    const [canEdit, setCanEdit] = useState(false);

    return (
        <AppScreen>
            <View style={styles.headerCopy}>
                <Text style={styles.pageTitle}>Adicionar Cuidador</Text>
            </View>
            <SurfaceCard>
                <View style={styles.form}>
                    <InputField label="E-mail do Cuidador" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                    <ToggleRow
                        icon="edit-3"
                        title="Permitir edição"
                        subtitle="Pode alterar nomes e horários de remédios"
                        value={canEdit}
                        onValueChange={setCanEdit}
                    />
                </View>
            </SurfaceCard>
            <View style={styles.formActions}>
                <GradientButton title="Cancelar" variant="danger" onPress={onCancel} />
                <GradientButton title="Confirmar Vínculo" onPress={() => onAdd(email, canEdit)} />
            </View>
        </AppScreen>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
    loadingText: { fontSize: 16, color: colors.textMuted },
    headerCopy: { gap: 8, marginBottom: 24 },
    pageTitle: { fontSize: 26, fontWeight: "bold", color: colors.text, textAlign: 'center' },
    pageSubtitle: { fontSize: 15, color: colors.textMuted, lineHeight: 22, textAlign: 'center', paddingHorizontal: 10 },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24 },
    emptyIcon: { width: 90, height: 90, borderRadius: radius.full, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
    lockIconContainer: { width: 90, height: 90, borderRadius: radius.full, backgroundColor: '#FFF3E0', alignItems: "center", justifyContent: "center" },
    listContainer: { gap: 16, marginBottom: 24 },
    caregiverItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    caregiverName: { fontSize: 16, fontWeight: "bold", color: colors.text },
    caregiverEmail: { fontSize: 14, color: colors.textMuted },
    caregiverPermission: { fontSize: 12, color: colors.primary, marginTop: 4, fontWeight: '600' },
    removeButton: { padding: 10, backgroundColor: '#FFEBEE', borderRadius: radius.full },
    form: { gap: 20 },
    formActions: { marginTop: 24, gap: 12 }
});