export interface User {
  id?: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'sponsor' | 'caregiver'; // O banco usa 'sponsor' para o responsável e 'caregiver' para cuidador
  createdAt?: Date;
}
