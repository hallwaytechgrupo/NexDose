export interface Medication {
  id?: number;
  name: string;
  dosage: string;
  
  // Controle de Horários
  startDate: Date;       // Data e horário da PRIMEIRA dose (horário inicial)
  intervalHours: number; // De quanto em quanto tempo deve tomar (ex: 8 para 8 em 8h, 12, 24, etc.)
  
  userId: number; // Relacionamento com o usuário
  createdAt?: Date;
  updatedAt?: Date;
}
