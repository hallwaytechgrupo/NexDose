import { Router, Request, Response, NextFunction } from 'express';
import { addCaregiver, getMyCaregivers, removeCaregiver } from '../controllers/caregiverController';

const router = Router();

// Middleware simulado de autenticação (igual aos outros arquivos)
const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  (req as any).userId = 1; // MOCK: Simula que o usuário logado é o responsável ID 1
  next();
};

// Buscar todos os cuidadores associados a mim
router.get('/', authenticateUser, getMyCaregivers);

// Adicionar um cuidador a mim (usando o email dele)
router.post('/', authenticateUser, addCaregiver);

// Remover um cuidador da minha lista
router.delete('/:caregiverId', authenticateUser, removeCaregiver);

export default router;
