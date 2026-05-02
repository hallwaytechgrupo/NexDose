import React, { useState } from 'react';
import { View, Text, Modal, FlatList, Pressable, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  schedulePreview,
  TabKey,
} from "../data/mockData";
import { colors, radius } from "../theme/tokens";


export default function MedicationsScreen({ onNavigate }: { onNavigate: (tab: TabKey) => void; }) {
  // 1. Estados para a Lista e para o Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [medicationsList, setMedicationsList] = useState([
    // Exemplo de item inicial para você ver a lista funcionando
    { id: '1', name: 'Dipirona 500mg', interval: '8h', nextDose: '14:00' }
  ]);

  // 2. Estados do seu formulário (mantidos do seu código original)
  const [selectedType, setSelectedType] = useState('capsule');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('8h');

  const onChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowPicker(false);
    setDate(currentDate);
  };

  const showTimepicker = () => {
    setShowPicker(true);
  };

  // 3. Função para salvar e fechar o modal
  const handleSaveMedication = () => {
    // Aqui você vai adicionar a lógica para salvar no banco/estado global
    // setMedicationsList([...medicationsList, novoRemedio]);
    
    setIsModalVisible(false); // Fecha o modal após salvar
  };

  return (
    <AppScreen useScrollView={false}>
      {/* ========================================== */}
      {/* TELA PRINCIPAL: LISTA DE MEDICAMENTOS      */}
      {/* ========================================== */}
      <Text style={[styles.pageTitle, { color: colors.primary }]}>Meus Medicamentos</Text>

      <FlatList
        data={medicationsList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SurfaceCard muted style={styles.medicationCard}>
            <Text style={styles.medName}>{item.name}</Text>
            <Text>Intervalo: {item.interval}</Text>
            <Text>Próxima dose: {item.nextDose}</Text>
          </SurfaceCard>
        )}
        ListEmptyComponent={<Text style={{ color: colors.text }}>Nenhum medicamento registrado ainda.</Text>}
      />

      {/* BOTÃO PARA ABRIR O MODAL */}
      <GradientButton
        title="Novo Medicamento"
        onPress={() => setIsModalVisible(true)}
      />

      {/* ========================================== */}
      {/* MODAL DE REGISTRO (O SEU CÓDIGO ORIGINAL)  */}
      {/* ========================================== */}
      <Modal
        visible={isModalVisible}
        animationType="slide" // Faz o modal subir a partir da base da tela
        presentationStyle="pageSheet" // No iOS, cria aquele efeito de "carta" que não cobre 100% da tela (opcional)
        onRequestClose={() => setIsModalVisible(false)} // Permite fechar no botão de voltar do Android
      >
        {/* Usamos uma View com flex: 1 para ocupar o Modal inteiro */}
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Registrar Novo Medicamento</Text>

            <SurfaceCard muted>
              <View style={styles.contentBlock}>
                <InputField
                  label="Nome do medicamento"
                  placeholder="Ex: Amoxicilina 500mg"
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
                          {date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    </Pressable>
                    {showPicker && (
                      <DateTimePicker
                        testID="dateTimePicker"
                        value={date}
                        mode={"time"}
                        is24Hour={true}
                        display="default"
                        onChange={onChange}
                      />
                    )}
                  </View>

                  <View style={styles.column}>
                    <SectionTitle>Intervalo</SectionTitle>
                    <View style={styles.chipsWrap}>
                      {intervals.map((interval) => (
                        <Chip
                          key={interval}
                          label={interval}
                          active={interval === selectedInterval}
                          onPress={() => setSelectedInterval(interval)}
                        />
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.timelineBlock}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineTitle}>Próximas doses estimadas</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    {schedulePreview.map((item) => (
                      <View
                        key={`${item.label}-${item.value}`}
                        style={styles.scheduleCard}
                      >
                        <Text style={styles.scheduleLabel}>{item.label}</Text>
                        <Text style={styles.scheduleValue}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </SurfaceCard>

            {/* Botões reconfigurados para fechar o Modal */}
            <View style={styles.modalButtons}>
              <GradientButton
                title="Finalizar registro"
                onPress={handleSaveMedication}
              />
              <GradientButton
                title="Cancelar"
                onPress={() => setIsModalVisible(false)} // Fecha o modal sem salvar
                variant="danger"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </AppScreen>
  );
}

// Estilos básicos para fazer a estrutura funcionar
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
    backgroundColor: '#f5f5f5', // Cor de fundo do modal
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicationCard: {
    padding: 15,
    marginBottom: 10,
  },
  medName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalButtons: {
    marginTop: 20,
    gap: 10, // Espaçamento entre os botões
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
