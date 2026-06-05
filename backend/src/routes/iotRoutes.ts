import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getRecentEvents } from '../controllers/iotController';

const router = Router();

router.use(authMiddleware);
router.get('/recent', getRecentEvents);

export default router;