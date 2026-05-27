import React, { useState } from 'react';
import {
  View, Text, Modal, FlatList, Pressable, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch
} from 'react-native';
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AppScreen,
  Chip,
  GradientButton,
  InputField,
  SectionTitle,
  SurfaceCard,
} from "../components/Primitives";
import { colors, radius } from "../theme/tokens";
import {
  createMedication,
  getMedications,
  updateMedication,
  deleteMedication
} from '../services/api';

interface MedicationsScreenProps {
  token: string;
  dispenserId: number | null;
  canEdit: boolean;
}

// ✅ A FUNÇÃO QUE VOCÊ QUERIA: Calcula os 4 horários (MANTIDA INTACTA)
function getNextFourDoses(nextDoseStr: string, intervalHours: number): string[] {
  if (!nextDoseStr || nextDoseStr === '--:--') return [];

  const [hourStr, minuteStr] = nextDoseStr.split(":");
  const baseHour = parseInt(hourStr, 10);
  const baseMinute = parseInt(minuteStr, 10) || 0;

  const now = new Date();
  const doseDate = new Date();
  doseDate.setHours(baseHour, baseMinute, 0, 0);
  doseDate.setDate(doseDate.getDate() - 1);

  while (doseDate <= now) {
    doseDate.setHours(doseDate.getHours() + intervalHours);
  }

  const hoursList: string[] = [];
  const tempDate = new Date(doseDate);

  for (let i = 0; i < 4; i++) {
    const h = String(tempDate.getHours()).padStart(2, '0');
    const m = String(tempDate.getMinutes()).padStart(2, '0');
    hoursList.push(`${h}:${m}`);

    tempDate.setHours(tempDate.getHours() + intervalHours);
  }

  return hoursList;
}

export default function MedicationsScreen({
                                            token,
                                            dispenserId,
                                            canEdit,
                                          }: MedicationsScreenProps) {
  // Instância do QueryClient para podermos forçar atualizações
  const queryClient = useQueryClient();

  // --- ESTADOS DO FORMULÁRIO (MANTIDOS! O usuário precisa deles para digitar) ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isContinuous, setIsContinuous] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(8);

  // 1. A BUSCA DE DADOS (Substitui o useEffect e o useState da lista)
  const { data: medicationsList = [], isLoading } = useQuery({
    queryKey: ['medications', dispenserId],
    enabled: !!dispenserId && !!token,
    queryFn: async () => {
      const data = await getMedications(token, dispenserId!);
      return data.map((med: any) => ({
        id: String(med.id),
        name: med.name,
        dosage: med.dosage || '',
        interval: med.interval_hours || med.interval,
        nextDose: med.start_time ? med.start_time.substring(0, 5) : (med.nextDose ? med.nextDose.substring(0, 5) : '--:--'),
        endDate: med.end_date || med.endDate,
        isContinuous: med.is_continuous !== undefined ? med.is_continuous : med.isContinuous,
      }));
    }
  });

  // 2. MUTAÇÕES (Substituem o setIsSubmitting e automatizam o recarregamento da lista)
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingId) {
        return await updateMedication(token, dispenserId!, editingId, payload);
      } else {
        return await createMedication(token, dispenserId!, payload);
      }
    },
    onSuccess: () => {
      // Magia pura: Invalida o cache e faz a lista recarregar sozinha na tela!
      queryClient.invalidateQueries({ queryKey: ['medications', dispenserId] });
      // Se a Home estiver usando a mesma queryKey, ela também vai atualizar o relógio!
      queryClient.invalidateQueries({ queryKey: ['nextMedication', dispenserId] });
      setIsModalVisible(false);
    },
    onError: (error: any) => {
      Alert.alert("Erro", error.message || "Falha ao salvar.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteMedication(token, dispenserId!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', dispenserId] });
      queryClient.invalidateQueries({ queryKey: ['nextMedication', dispenserId] });
      setIsModalVisible(false);
    }
  });

  // --- FUNÇÕES DE AÇÃO PARA ABRIR O MODAL ---
  const handleOpenCreate = () => {
    if (!canEdit) {
      Alert.alert("Acesso Restrito", "Você não tem permissão para adicionar medicamentos.");
      return;
    }
    setEditingId(null);
    setMedicationName('');
    setDosage('');
    setStartDate(new Date());
    setEndDate(new Date());
    setIsContinuous(false);
    setSelectedInterval(8);
    setIsModalVisible(true);
  };

  const handleOpenEdit = (med: any) => {
    setEditingId(med.id);
    setMedicationName(med.name);
    setDosage(med.dosage);
    setSelectedInterval(med.interval);
    setIsContinuous(med.isContinuous);
    if (med.endDate) setEndDate(new Date(med.endDate));

    if (med.nextDose && med.nextDose !== '--:--') {
      const [h, m] = med.nextDose.split(':');
      const d = new Date();
      d.setHours(parseInt(h), parseInt(m), 0, 0);
      setStartDate(d);
    }
    setIsModalVisible(true);
  };

  const handleSaveMedication = () => {
    if (!dispenserId) return;
    if (!medicationName || !dosage) {
      Alert.alert("Erro", "Nome e dosagem são obrigatórios.");
      return;
    }

    const payload = {
      name: medicationName,
      dosage: dosage,
      startDate: startDate.toISOString(),
      intervalHours: selectedInterval,
      isContinuous: isContinuous,
      endDate: isContinuous ? null : endDate.toISOString(),
    };

    saveMutation.mutate(payload);
  };

  const handleDelete = () => {
    if(!editingId || !dispenserId) return;
    Alert.alert("Excluir", "Deseja remover este medicamento?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Deletar", style: "destructive", onPress: () => deleteMutation.mutate(editingId) }
    ]);
  };

  return (
      <AppScreen useScrollView={false}>
        <Text style={styles.pageTitle}>Medicamentos</Text>

        {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
        ) : (
            <FlatList
                data={medicationsList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isExpired = item.endDate && new Date(item.endDate) < new Date();
                  const nextHours = getNextFourDoses(item.nextDose, item.interval);

                  return (
                      <SurfaceCard muted style={[styles.medCard, isExpired && { opacity: 0.6 }]}>
                        <View style={styles.cardHeader}>
                          <View style={{ flex: 1, gap: 8 }}>
                            <View>
                              <Text style={styles.medName}>{item.name} {item.dosage}</Text>
                              <Text style={styles.medInfo}>Intervalo: de {item.interval}h em {item.interval}h</Text>
                            </View>

                            {nextHours.length > 0 && (
                                <View style={styles.scheduleRow}>
                                  {nextHours.map((time, index) => (
                                      <View key={index} style={[styles.timeBadge, index === 0 && styles.nextTimeBadge]}>
                                        <Text style={[styles.timeBadgeText, index === 0 && styles.nextTimeBadgeText]}>
                                          {time}
                                        </Text>
                                      </View>
                                  ))}
                                </View>
                            )}
                          </View>
                          {canEdit && (
                              <Pressable style={styles.editButton} onPress={() => handleOpenEdit(item)}>
                                <Feather name="edit-2" size={18} color={colors.primary} />
                              </Pressable>
                          )}
                        </View>
                      </SurfaceCard>
                  );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum medicamento no dispenser.</Text>}
            />
        )}

        {canEdit && (
            <GradientButton title="Novo Medicamento" onPress={handleOpenCreate} />
        )}

        {/* MODAL COMPLETO DE CADASTRO/EDIÇÃO */}
        <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>{editingId ? "Editar" : "Novo Medicamento"}</Text>
                {editingId && canEdit && (
                    <Pressable onPress={handleDelete} style={styles.deleteIconBtn}>
                      {deleteMutation.isPending ? (
                          <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                          <Feather name="trash-2" size={20} color={colors.error} />
                      )}
                    </Pressable>
                )}
              </View>

              <SurfaceCard muted>
                <View style={styles.contentBlock}>
                  <InputField label="Nome do Remédio" value={medicationName} onChangeText={setMedicationName} editable={canEdit} />
                  <InputField label="Dosagem (ex: 500mg)" value={dosage} onChangeText={setDosage} editable={canEdit} />

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <SectionTitle>Uso contínuo?</SectionTitle>
                      <Text style={styles.subLabel}>Sem data de término definida</Text>
                    </View>
                    <Switch
                        value={isContinuous}
                        onValueChange={setIsContinuous}
                        disabled={!canEdit}
                        trackColor={{ false: colors.outline, true: colors.primary }}
                    />
                  </View>

                  {!isContinuous && (
                      <View>
                        <SectionTitle>Data de Término</SectionTitle>
                        <Pressable onPress={() => canEdit && setShowEndPicker(true)} style={styles.selectorField}>
                          <Feather name="calendar" size={18} color={colors.primary} />
                          <Text style={styles.selectorText}>{endDate.toLocaleDateString('pt-BR')}</Text>
                        </Pressable>
                        {showEndPicker && (
                            <DateTimePicker value={endDate} mode="date" onChange={(e, d) => { setShowEndPicker(false); if(d) setEndDate(d); }} />
                        )}
                      </View>
                  )}

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <SectionTitle>Hora da 1ª Dose</SectionTitle>
                      <Pressable onPress={() => canEdit && setShowPicker(true)} style={styles.selectorField}>
                        <Feather name="clock" size={18} color={colors.primary} />
                        <Text style={styles.selectorText}>{startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </Pressable>
                      {showPicker && (
                          <DateTimePicker value={startDate} mode="time" is24Hour={true} onChange={(e, d) => { setShowPicker(false); if(d) setStartDate(d); }} />
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <SectionTitle>Intervalo (h)</SectionTitle>
                      <View style={styles.chipsRow}>
                        {[4, 6, 8, 12].map(h => (
                            <Chip key={h} label={`${h}h`} active={selectedInterval === h} onPress={() => canEdit && setSelectedInterval(h)} />
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </SurfaceCard>

              <View style={{...styles.modalButtons}}>
                <GradientButton title="Cancelar" variant="danger" onPress={() => setIsModalVisible(false)} />
                {canEdit && (
                    <GradientButton
                        title={saveMutation.isPending ? "Salvando..." : "Salvar"}
                        onPress={handleSaveMedication}
                        // Desabilita o botão para evitar cliques duplos
                        disabled={saveMutation.isPending}
                    />
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>
      </AppScreen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  medCard: { padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  medName: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  medInfo: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  scheduleRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  timeBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: "#E5E7EB" },
  timeBadgeText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  nextTimeBadge: { backgroundColor: "rgba(111,251,133,0.2)", borderColor: colors.secondary || "#6FFB85" },
  nextTimeBadgeText: { color: "#2E7D32", fontWeight: "800" },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  intervalTag: { backgroundColor: colors.primarySoft, color: colors.primary, paddingHorizontal: 8, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  continuousTag: { backgroundColor: '#E3F2FD', color: '#1976D2', paddingHorizontal: 8, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  dateTag: { backgroundColor: '#F5F5F5', color: colors.textMuted, paddingHorizontal: 8, borderRadius: 4, fontSize: 12 },
  editButton: { padding: 8, borderRadius: radius.full, backgroundColor: colors.surfaceLowest, borderWidth: 1, borderColor: colors.outline },
  emptyText: { textAlign: 'center', marginTop: 40, color: colors.textMuted },
  modalContainer: { flex: 1, padding: 20, backgroundColor: colors.background },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginTop:50 },
  deleteIconBtn: { padding: 10, backgroundColor: '#FFEBEE', borderRadius: radius.full, marginTop: 50 },
  contentBlock: { gap: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  subLabel: { fontSize: 12, color: colors.textMuted },
  selectorField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceLowest, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.outline },
  selectorText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modalButtons: { marginTop: 30, gap: 10, paddingBottom: 20 }
});