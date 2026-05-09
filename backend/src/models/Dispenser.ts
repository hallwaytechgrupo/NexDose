export interface Dispenser {
  id?: number;
  responsavelId: number; // ID do usuário com role 'sponsor' (o init.sql chamou a coluna de responsavel_id)
  name: string;
  status: 'offline' | 'online' | 'low_battery' | string;
  lastSync?: Date;
  createdAt?: Date;
}
