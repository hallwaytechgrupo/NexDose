export interface Medication {
  id?: number;
  dispenserId: number;
  name: string;
  dosage: string;
  createdAt?: Date;
}

