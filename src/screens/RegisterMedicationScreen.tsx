import React, { useState, useEffect } from 'react';
import { View, Text, Modal, FlatList, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
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

// MOCK TOKEN - Substitua isso pela lógica real de pegar o token do contexto/estado
const MOCK_TOKEN = "seu_token_jwt_aqui";

export default function MedicationsScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [medicationsList, setMedicationsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ESTADOS DO FORMULÁRIO (Criação e Edição) ---
  const [editingId, setEditingId] = useState<string | null>(null); // Se tiver um ID, estamos editando
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [selectedType, setSelectedType] = useState('capsule');
  const [startDate, setStartDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false); 

  // Carregar os medicamentos quando a tela for montada
  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      setIsLoading(true);
      const data = await getMedications(MOCK_TOKEN);
      
      const formattedData = data.map((med: any) => ({
        id: String(med.id),
        name: med.name,
        dosage: med.dosage || '',
        interval: med.interval_hours,
        nextDose: med.start_time ? med.start_time.substring(0, 5) : '--:--', 
      }));
      
      setMedicationsList(formattedData);
    } catch (error) {
      console.error("Erro ao buscar medicamentos:", error);
      setMedicationsList([
          { id: 'mock-1', name: 'Dipirona', dosage: '500mg', interval: 8, nextDose: '14:00' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startDate;
    setShowPicker(false);
    setStartDate(currentDate);
  };

  const showTimepicker = () => {
    setShowPicker(true);
  };

  // Prepara o modal para criar um NOVO medicamento
  const handleOpenCreateModal = () => {
    setEditingId(null);
    setMedicationName('');
    setDosage('');
    setStartDate(new Date());
    setSelectedInterval(8);
    setIsModalVisible(true);
  };

  // Prepara o modal para EDITAR um medicamento existente
  const handleOpenEditModal = (medication: any) => {
    setEditingId(medication.id);
    setMedicationName(medication.name);
    setDosage(medication.dosage);
    setSelectedInterval(medication.interval);
    
    // Tenta recriar a data a partir da string HH:mm (simplificado)
    const newDate = new Date();
    if(medication.nextDose !== '--:--'){
        const [hours, minutes] = medication.nextDose.split(':');
        newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }
    setStartDate(newDate);
    
    setIsModalVisible(true);
  };

  // Salva a criação ou a edição
  const handleSaveMedication = async () => {
    if (!medicationName || !dosage) {
      Alert.alert("Erro", "Por favor, preencha o nome e a dosagem do medicamento.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: medicationName,
        dosage: dosage,
        startDate: startDate.toISOString(), 
        intervalHours: selectedInterval,
      };

      if (editingId) {
        // MODO EDIÇÃO
        console.log("Atualizando backend:", editingId, payload);
        await updateMedication(MOCK_TOKEN, editingId, payload);
        Alert.alert("Sucesso", "Medicamento atualizado com sucesso!");
      } else {
        // MODO CRIAÇÃO
        console.log("Enviando para o backend:", payload);
        await createMedication(MOCK_TOKEN, payload);
        Alert.alert("Sucesso", "Medicamento registrado com sucesso!");
      }

      await fetchMedications();
      setIsModalVisible(false); 

    } catch (error: any) {
      console.error("Erro ao salvar medicamento:", error);
      Alert.alert("Erro", "Erro ao conectar com API.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deleta o medicamento
  const handleDeleteMedication = async () => {
    if(!editingId) return;

    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja deletar este medicamento?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Deletar", 
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await deleteMedication(MOCK_TOKEN, editingId);
              Alert.alert("Sucesso", "Medicamento removido.");
              await fetchMedications();
              setIsModalVisible(false);
            } catch (error) {
               console.error("Erro ao deletar:", error);
               Alert.alert("Erro", "Falha ao deletar o medicamento.");
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <AppScreen useScrollView={false}>
      <Text style={[styles.pageTitle, { color: colors.primary }]}>Medicamentos</Text>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textMuted }}>Carregando medicamentos...</Text>
        </View>
      ) : (
        <FlatList
          data={medicationsList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SurfaceCard muted style={styles.medicationCard}>
              <View style={styles.cardHeader}>
                 <View>
                    <Text style={styles.medName}>{item.name} {item.dosage}</Text>
                    <Text style={styles.medInfo}>Intervalo: {item.interval}h</Text>
                    <Text style={styles.medInfo}>Próxima dose: {item.nextDose}</Text>
                 </View>
                 <Pressable style={styles.editButton} onPress={() => handleOpenEditModal(item)}>
                    <Feather name="edit-2" size={20} color={colors.primary} />
                 </Pressable>
              </View>
            </SurfaceCard>
          )}
          ListEmptyComponent={
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Nenhum medicamento registrado ainda.</Text>
            </View>
          }
        />
      )}

      <GradientButton
        title="Novo Medicamento"
        onPress={handleOpenCreateModal}
      />

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeaderRow}>
               <Text style={[styles.modalTitle, { color: colors.primary }]}>
                 {editingId ? "Editar Medicamento" : "Registrar Novo Medicamento"}
               </Text>
               {editingId && (
                 <Pressable onPress={handleDeleteMedication} style={styles.deleteIconBtn}>
                    <Feather name="trash-2" size={24} color={colors.error} />
                 </Pressable>
               )}
            </View>

            <SurfaceCard muted>
              <View style={styles.contentBlock}>
                <InputField
                  label="Nome do medicamento"
                  placeholder="Ex: Amoxicilina"
                  value={medicationName}
                  onChangeText={setMedicationName}
                />
                <InputField
                  label="Dosagem"
                  placeholder="Ex: 500mg"
                  value={dosage}
                  onChangeText={setDosage}
                />

                <View style={styles.contentBlock}>
                  <SectionTitle>Forma farmacêutica</SectionTitle>
                  <View style={styles.typeGrid}>
                    {medicationTypes.map((item) => {
                      const active = item.key === selectedType;
                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => setSelectedType(item.key)}
                          style={[
                            styles.typeCard,
                            active ? styles.typeCardActive : undefined,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={item.icon as any}
                            size={24}
                            color={active ? colors.white : colors.primary}
                          />
                          <Text
                            style={[
                              styles.typeText,
                              active ? styles.typeTextActive : undefined,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.twoCols}>
                  <View style={styles.column}>
                    <SectionTitle>Definir o horário da primeira dose</SectionTitle>
                    <Pressable onPress={showTimepicker}>
                      <View style={styles.timePicker}>
                        <Text style={styles.timePickerMain}>
                          {startDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    </Pressable>
                    {showPicker && (
                      <DateTimePicker
                        testID="dateTimePicker"
                        value={startDate}
                        mode={"time"}
                        is24Hour={true}
                        display="default"
                        onChange={onDateChange}
                      />
                    )}
                  </View>

                  <View style={styles.column}>
                    <SectionTitle>Intervalo (em horas)</SectionTitle>
                    <View style={styles.chipsWrap}>
                      {intervals.map((interval) => (
                        <Chip
                          key={interval}
                          label={`${interval}h`}
                          active={interval === selectedInterval}
                          onPress={() => setSelectedInterval(interval)}
                        />
                      ))}
                    </View>
                  </View>
                </View>

              </View>
            </SurfaceCard>

            <View style={styles.modalButtons}>
              <GradientButton
                title={isSubmitting ? "Salvando..." : (editingId ? "Salvar Alterações" : "Finalizar registro")}
                onPress={handleSaveMedication}
              />
              <GradientButton
                title="Cancelar"
                onPress={() => setIsModalVisible(false)}
                variant="danger"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  deleteIconBtn: {
    padding: 8,
    backgroundColor: colors.errorSoft,
    borderRadius: radius.full,
  },
  medicationCard: {
    padding: 15,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
  },
  medName: {
    color: colors.primary, 
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4, 
  },
  medInfo: {
    color: colors.textMuted,
    fontSize: 14,
  },
  modalButtons: {
    marginTop: 20,
    gap: 10,
  },
  headerCopy: {
    gap: 8,
  },
  contentBlock: {
    gap: 22,
  },
  typeGrid: {
    flexDirection: "row",
    gap: 12,
  },
  typeCard: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLowest,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 10,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  typeCardActive: {
    backgroundColor: colors.primary,
  },
  typeIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  typeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  typeTextActive: {
    color: colors.white,
  },
  twoCols: {
    gap: 20,
  },
  column: {
    gap: 12,
  },
  timePicker: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.lg,
    paddingVertical: 22,
    alignItems: "center",
    gap: 8,
  },
  timePickerMain: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: "900",
  },
  timePickerGhost: {
    color: colors.outline,
    fontSize: 14,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timelineBlock: {
    gap: 14,
    paddingTop: 8,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  timelineTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  timelineBadge: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  scheduleRow: {
    flexDirection: "row",
    gap: 10,
  },
  scheduleCard: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  scheduleLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  scheduleValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  cancel: {
    color: colors.outline,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
  },
});
