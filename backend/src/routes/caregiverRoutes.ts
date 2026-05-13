import { Router } from 'express';
import { addCaregiver, getMyCaregivers, removeCaregiver } from '../controllers/caregiverController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Buscar todos os cuidadores associados a mim
router.get('/', authMiddleware, getMyCaregivers);

// Adicionar um cuidador a mim (usando o email dele)
router.post('/', authMiddleware, addCaregiver);

// Remover um cuidador da minha lista
router.delete('/:caregiverId', authMiddleware, removeCaregiver);

export default router;
