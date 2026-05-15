import React, { useState, useEffect } from 'react';
import { View, Text, Modal, FlatList, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  AppScreen,
  Chip,
  GradientButton,
  InputField,
  SectionTitle,
  SurfaceCard,
} from "../components/Primitives";
import {
  intervals,
  medicationTypes,
} from "../data/mockData";
import { colors, radius } from "../theme/tokens";
import { createMedication, getMedications, updateMedication, deleteMedication } from '../services/api';

// Adicionada a tipagem para canEdit recebida do AppShell
interface MedicationsScreenProps {
  token: string;
  dispenserId: number | null;
  canEdit: boolean;
}

export default function MedicationsScreen({
                                            token,
                                            dispenserId,
                                            canEdit,
                                          }: MedicationsScreenProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [medicationsList, setMedicationsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ESTADOS DO FORMULÁRIO ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [selectedType, setSelectedType] = useState('capsule');
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
      setMedicationsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!canEdit) return; // Segurança extra no front
    setEditingId(null);
    setMedicationName('');
    setDosage('');
    setStartDate(new Date());
    setEndDate(new Date());
    setIsContinuous(false);
    setSelectedInterval(8);
    setIsModalVisible(true);
  };

  const handleOpenEditModal = (medication: any) => {
    setEditingId(medication.id);
    setMedicationName(medication.name);
    setDosage(medication.dosage);
    setSelectedInterval(medication.interval);
    setIsContinuous(medication.isContinuous);

    if (medication.endDate) {
      setEndDate(new Date(medication.endDate));
    }

    const newDate = new Date();
    if(medication.nextDose !== '--:--'){
      const [hours, minutes] = medication.nextDose.split(':');
      newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }
    setStartDate(newDate);
    setIsModalVisible(true);
  };

  const handleSaveMedication = async () => {
    if (!dispenserId) {
      Alert.alert("Erro", "Selecione um dispositivo primeiro.");
      return;
    }
    if (!medicationName || !dosage) {
      Alert.alert("Erro", "Preencha o nome e a dosagem.");
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
        Alert.alert("Sucesso", "Medicamento atualizado!");
      } else {
        await createMedication(token, dispenserId, payload);
        Alert.alert("Sucesso", "Medicamento registrado!");
      }

      await fetchMedications();
      setIsModalVisible(false);
    } catch (error: any) {
      // Captura a mensagem de erro vinda do seu Back-end (403 Forbidden)
      const serverMessage = error.response?.data?.error || "Falha ao salvar medicamento no servidor.";
      Alert.alert("Acesso Negado", serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMedication = async () => {
    if(!editingId || !dispenserId) return;

    Alert.alert("Confirmar Exclusão", "Deseja deletar este medicamento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Deletar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMedication(token, dispenserId, editingId);
            await fetchMedications();
            setIsModalVisible(false);
          } catch (error: any) {
            const serverMessage = error.response?.data?.error || "Falha ao deletar.";
            Alert.alert("Erro", serverMessage);
          }
        }
      }
    ]);
  };

  return (
      <AppScreen useScrollView={false}>
        <Text style={[styles.pageTitle, { color: colors.primary }]}>Medicamentos</Text>

        {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
        ) : (
            <FlatList
                data={medicationsList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const isExpired = item.endDate && new Date(item.endDate) < new Date();

                  return (
                      <SurfaceCard
                          muted
                          style={[
                            styles.medicationCard,
                            isExpired && { opacity: 0.6, backgroundColor: '#F0F0F0' }
                          ]}
                      >
                        <View style={styles.cardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.medName, isExpired && { color: colors.textMuted }]}>
                              {item.name} {item.dosage} {isExpired ? "(Finalizado)" : ""}
                            </Text>

                            <Text style={styles.medInfo}>Próxima dose: {item.nextDose}</Text>

                            <View style={styles.tagRow}>
                              <Text style={styles.intervalTag}>{item.interval}h</Text>
                              {item.isContinuous ? (
                                  <Text style={styles.continuousTag}>Contínuo</Text>
                              ) : (
                                  <Text style={styles.dateTag}>
                                    Até {item.endDate ? new Date(item.endDate).toLocaleDateString('pt-BR') : '--'}
                                  </Text>
                              )}
                            </View>
                          </View>

                          {/* Só exibe o botão de editar se canEdit for true */}
                          {canEdit && (
                              <Pressable style={styles.editButton} onPress={() => handleOpenEditModal(item)}>
                                <Feather name="edit-2" size={18} color={colors.primary} />
                              </Pressable>
                          )}
                        </View>
                      </SurfaceCard>
                  );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum medicamento registrado.</Text>}
            />
        )}

        {/* Só exibe o botão de "Novo" se canEdit for true */}
        {canEdit && (
            <GradientButton title="Novo Medicamento" onPress={handleOpenCreateModal} />
        )}

        <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: colors.primary }]}>
                  {editingId ? "Editar" : "Novo Medicamento"}
                </Text>
                {/* Ícone de lixeira só para quem pode editar */}
                {editingId && canEdit && (
                    <Pressable onPress={handleDeleteMedication} style={styles.deleteIconBtn}>
                      <Feather name="trash-2" size={20} color={colors.error} />
                    </Pressable>
                )}
              </View>

              <SurfaceCard muted>
                <View style={styles.contentBlock}>
                  <InputField label="Nome" value={medicationName} onChangeText={setMedicationName} editable={canEdit} />
                  <InputField label="Dosagem" value={dosage} onChangeText={setDosage} editable={canEdit} />

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <SectionTitle>Uso contínuo?</SectionTitle>
                      <Text style={styles.subLabel}>O tratamento não tem data de término</Text>
                    </View>
                    <Switch
                        value={isContinuous}
                        onValueChange={setIsContinuous}
                        trackColor={{ false: colors.outline, true: colors.primary }}
                        disabled={!canEdit}
                    />
                  </View>

                  {!isContinuous && (
                      <View style={styles.column}>
                        <SectionTitle>Data de Término</SectionTitle>
                        <Pressable
                            onPress={() => canEdit && setShowEndPicker(true)}
                            style={[styles.dateSelector, !canEdit && { opacity: 0.5 }]}
                        >
                          <Feather name="calendar" size={18} color={colors.primary} />
                          <Text style={styles.dateText}>{endDate.toLocaleDateString('pt-BR')}</Text>
                        </Pressable>
                        {showEndPicker && (
                            <DateTimePicker
                                value={endDate}
                                mode="date"
                                onChange={(e, d) => { setShowEndPicker(false); if(d) setEndDate(d); }}
                            />
                        )}
                      </View>
                  )}

                  <View style={styles.twoCols}>
                    <View style={styles.column}>
                      <SectionTitle>Horário da 1ª dose</SectionTitle>
                      <Pressable
                          onPress={() => canEdit && setShowPicker(true)}
                          style={[styles.timePicker, !canEdit && { opacity: 0.5 }]}
                      >
                        <Text style={styles.timePickerMain}>
                          {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </Pressable>
                      {showPicker && (
                          <DateTimePicker
                              value={startDate}
                              mode="time"
                              is24Hour={true}
                              onChange={(e, d) => { setShowPicker(false); if(d) setStartDate(d); }}
                          />
                      )}
                    </View>

                    <View style={styles.column}>
                      <SectionTitle>Intervalo</SectionTitle>
                      <View style={styles.chipsWrap}>
                        {intervals.map((i) => (
                            <Chip
                                key={i}
                                label={`${i}h`}
                                active={i === selectedInterval}
                                onPress={() => canEdit && setSelectedInterval(i)}
                            />
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </SurfaceCard>

              <View style={styles.modalButtons}>
                {/* Só mostra o botão de Salvar se canEdit for true */}
                {canEdit && (
                    <GradientButton title={isSubmitting ? "Salvando..." : "Salvar"} onPress={handleSaveMedication} />
                )}
                <GradientButton title="Cancelar" onPress={() => setIsModalVisible(false)} variant="danger" />
              </View>
            </ScrollView>
          </View>
        </Modal>
      </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  medicationCard: { padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  medName: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  medInfo: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 8 },
  intervalTag: { backgroundColor: colors.primarySoft, color: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  continuousTag: { backgroundColor: '#E3F2FD', color: '#1976D2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  dateTag: { backgroundColor: '#F5F5F5', color: colors.textMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12 },
  editButton: { padding: 10, backgroundColor: colors.surfaceLowest, borderRadius: radius.full, borderWidth: 1, borderColor: colors.outline },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  modalContainer: { flex: 1, padding: 20, backgroundColor: colors.background },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  deleteIconBtn: { padding: 10, backgroundColor: '#FFEBEE', borderRadius: radius.full },
  contentBlock: { gap: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  subLabel: { fontSize: 12, color: colors.textMuted },
  dateSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceLowest, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.outline },
  dateText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  timePicker: { backgroundColor: colors.surfaceLowest, padding: 15, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.outline },
  timePickerMain: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalButtons: { marginTop: 30, gap: 12, paddingBottom: 20 },
  twoCols: { gap: 20 },
  column: { flex: 1 }
});