import { Router, Request, Response, NextFunction } from 'express';
import { getMedications, createMedication, updateMedication, deleteMedication } from '../controllers/medicationController';

const router = Router();

// Middleware de autenticação de exemplo (substitua pelo seu real)
// Este middleware deve verificar o token e adicionar o userId ao objeto req
const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  // Por enquanto, vamos simular um usuário logado com ID 1
  // Em um ambiente real, você decodificaria o JWT aqui e obteria o ID do usuário
  (req as any).userId = 1;
  next();
};

// Rota para buscar todos os medicamentos do usuário
router.get('/', authenticateUser, getMedications);

// Rota para registrar um novo medicamento
router.post('/', authenticateUser, createMedication);

// Rota para atualizar um medicamento existente
router.put('/:id', authenticateUser, updateMedication);

// Rota para deletar um medicamento
router.delete('/:id', authenticateUser, deleteMedication);

export default router;
