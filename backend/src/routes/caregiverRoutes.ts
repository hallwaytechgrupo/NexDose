import { Router } from 'express';
import { addCaregiver, getDeviceCaregivers, removeCaregiver } from '../controllers/caregiverController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Buscar todos os cuidadores associados a um dispositivo (requer dispenserId)
router.get('/', authMiddleware, getDeviceCaregivers);

// Adicionar um cuidador a mim (usando o email dele)
router.post('/', authMiddleware, addCaregiver);

// Remover um cuidador da minha lista
router.delete('/:caregiverId', authMiddleware, removeCaregiver);

export default router;
