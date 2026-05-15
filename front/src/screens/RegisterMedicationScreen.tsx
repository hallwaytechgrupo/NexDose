import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, FlatList, Pressable, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch
} from 'react-native';
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  AppScreen,
  Chip,
  GradientButton,
  InputField,
  SectionTitle,
  SurfaceCard,
} from "../components/Primitives";
import { intervals } from "../data/mockData"; // Certifique-se que este mock existe
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
  canEdit: boolean; // Flag de permissão vinda do AppShell
}

export default function MedicationsScreen({
                                            token,
                                            dispenserId,
                                            canEdit,
                                          }: MedicationsScreenProps) {
  // --- ESTADOS ---
  const [medicationsList, setMedicationsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // --- ESTADOS DO FORMULÁRIO COMPLETO ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isContinuous, setIsContinuous] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMedications();
  }, [token, dispenserId]);

  const fetchMedications = async () => {
    try {
      setIsLoading(true);
      if (!dispenserId) {
        setMedicationsList([]);
        return;
      }

      const data = await getMedications(token, dispenserId);

      const formattedData = data.map((med: any) => ({
        id: String(med.id),
        name: med.name,
        dosage: med.dosage || '',
        interval: med.interval_hours,
        nextDose: med.start_time ? med.start_time.substring(0, 5) : '--:--',
        endDate: med.end_date,
        isContinuous: med.end_date === null,
      }));

      setMedicationsList(formattedData);
    } catch (error) {
      console.error("Erro ao buscar medicamentos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNÇÕES DE AÇÃO ---
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

    // Ajusta o horário da 1ª dose para exibição
    if (med.nextDose !== '--:--') {
      const [h, m] = med.nextDose.split(':');
      const d = new Date();
      d.setHours(parseInt(h), parseInt(m), 0, 0);
      setStartDate(d);
    }
    setIsModalVisible(true);
  };

  const handleSaveMedication = async () => {
    if (!dispenserId) return;
    if (!medicationName || !dosage) {
      Alert.alert("Erro", "Nome e dosagem são obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: medicationName,
        dosage: dosage,
        startDate: startDate.toISOString(),
        intervalHours: selectedInterval,
        isContinuous: isContinuous,
        endDate: isContinuous ? null : endDate.toISOString(),
      };

      if (editingId) {
        await updateMedication(token, dispenserId, editingId, payload);
      } else {
        await createMedication(token, dispenserId, payload);
      }
      await fetchMedications();
      setIsModalVisible(false);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if(!editingId || !dispenserId) return;
    Alert.alert("Excluir", "Deseja remover este medicamento?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Deletar", style: "destructive", onPress: async () => {
          await deleteMedication(token, dispenserId, editingId);
          await fetchMedications();
          setIsModalVisible(false);
        }}
    ]);
  };

  return (
      <AppScreen useScrollView={false}>
        <Text style={styles.pageTitle}>Medicamentos do Dispositivo</Text>

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
                  return (
                      <SurfaceCard muted style={[styles.medCard, isExpired && { opacity: 0.6 }]}>
                        <View style={styles.cardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.medName}>{item.name} {item.dosage}</Text>
                            <Text style={styles.medInfo}>Próxima: {item.nextDose} • {item.interval}h</Text>
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
                      <Feather name="trash-2" size={20} color={colors.error} />
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

              <View style={styles.modalButtons}>
                {canEdit && <GradientButton title={isSubmitting ? "Salvando..." : "Salvar"} onPress={handleSaveMedication} />}
                <GradientButton title="Cancelar" variant="danger" onPress={() => setIsModalVisible(false)} />
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
  medInfo: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  intervalTag: { backgroundColor: colors.primarySoft, color: colors.primary, paddingHorizontal: 8, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  continuousTag: { backgroundColor: '#E3F2FD', color: '#1976D2', paddingHorizontal: 8, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  dateTag: { backgroundColor: '#F5F5F5', color: colors.textMuted, paddingHorizontal: 8, borderRadius: 4, fontSize: 12 },
  editButton: { padding: 8, borderRadius: radius.full, backgroundColor: colors.surfaceLowest, borderWidth: 1, borderColor: colors.outline },
  emptyText: { textAlign: 'center', marginTop: 40, color: colors.textMuted },
  modalContainer: { flex: 1, padding: 20, backgroundColor: colors.background },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  deleteIconBtn: { padding: 10, backgroundColor: '#FFEBEE', borderRadius: radius.full },
  contentBlock: { gap: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  subLabel: { fontSize: 12, color: colors.textMuted },
  selectorField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceLowest, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.outline },
  selectorText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modalButtons: { marginTop: 30, gap: 10, paddingBottom: 20 }
});