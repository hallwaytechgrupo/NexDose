export interface CaregiverAssociation {
  id?: number;
  caregiverId: number; // ID do usuário com role 'caregiver'
  sponsorId: number;   // ID do usuário com role 'sponsor' (responsável)
  createdAt?: Date;
}
