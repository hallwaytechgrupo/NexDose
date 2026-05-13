export interface Caregiver {
  id: number | string;
  name: string;
  email: string;
  Tel?: string; // Opcional, caso o usuário não tenha cadastrado telefone
}