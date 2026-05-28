import { Router } from 'express';
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  getHistory
} from '../controllers/medicationController';
import { getWeeklyAdherence } from '../controllers/adherenceController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Aplica o middleware de autenticação para TODAS as rotas abaixo
router.use(authMiddleware);

// Rotas de Medicamentos
router.get('/:dispenserId/medications', getMedications);
router.post('/:dispenserId/medications', createMedication);
router.put('/:dispenserId/medications/:id', updateMedication);
router.delete('/:dispenserId/medications/:id', deleteMedication);

// Rota de Histórico
router.get('/:dispenserId/history', getHistory);

router.get('/:dispenserId/adherence', getWeeklyAdherence);

export default router;
