import { Router } from 'express';
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
} from '../controllers/medicationController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', getMedications);
router.post('/', createMedication);
router.put('/:id', updateMedication);
router.delete('/:id', deleteMedication);

export default router;

