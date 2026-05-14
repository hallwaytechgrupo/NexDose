import { Router } from 'express';
import { getDispensers, claimDispenser, unclaimDispenser } from '../controllers/dispenserController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getDispensers);
router.post('/claim', authMiddleware, claimDispenser);
// Backwards-compatible alias
router.post('/', authMiddleware, claimDispenser);
router.delete('/:id', authMiddleware, unclaimDispenser);

export default router;
