export interface Dispenser {
  id?: number;
  sponsorId?: number | null; // Dono (role 'sponsor'); pode ser null se ainda nao foi "claimado"
  serialNumber?: string;
  name?: string | null;
  status: 'offline' | 'online' | 'low_battery' | string;
  lastSync?: Date;
  createdAt?: Date;
}

