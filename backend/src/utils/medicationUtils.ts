import { Medication } from '../models/Medication';

/**
 * Função utilitária para calcular os próximos horários que o paciente precisa tomar o remédio.
 * 
 * @param medication O medicamento com o horário inicial (startDate) e o intervalo (intervalHours)
 * @param count Quantas próximas doses você quer calcular (padrão: 5)
 * @returns Um array de datas (Date) com os horários calculados
 */
export function calculateNextDoses(medication: Medication, count: number = 5): Date[] {
  const doses: Date[] = [];
  
  // Clonamos a data inicial para não modificar o objeto original
  let currentDoseTime = new Date(medication.startDate.getTime());

  for (let i = 0; i < count; i++) {
    // Guarda o horário calculado atual
    doses.push(new Date(currentDoseTime.getTime()));
    
    // Adiciona o intervalo de horas para descobrir a próxima dose
    currentDoseTime.setHours(currentDoseTime.getHours() + medication.intervalHours);
  }

  return doses;
}
