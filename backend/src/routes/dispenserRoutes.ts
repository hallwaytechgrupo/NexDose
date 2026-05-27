import { Router } from 'express';
import { getDispensers, claimDispenser, unclaimDispenser } from '../controllers/dispenserController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getDispenserSettings, upsertDispenserSettings } from "../controllers/dispenserSettingsController";
import { getMyNotificationPreferences, upsertMyNotificationPreferences } from "../controllers/userNotificationPreferencesController";

// Importe o getHistory do controller onde ele foi criado (ajuste o caminho se necessário)
import { getHistory } from '../controllers/medicationController';

const router = Router();

router.get('/', authMiddleware, getDispensers);
router.post('/claim', authMiddleware, claimDispenser);
// Backwards-compatible alias
router.post('/', authMiddleware, claimDispenser);
router.get('/:dispenserId/settings', authMiddleware, getDispenserSettings);
router.put('/:dispenserId/settings', authMiddleware, upsertDispenserSettings);
router.get('/:dispenserId/my-notification-preferences', authMiddleware, getMyNotificationPreferences);
router.put('/:dispenserId/my-notification-preferences', authMiddleware, upsertMyNotificationPreferences);
router.delete('/:id', authMiddleware, unclaimDispenser);

// ADICIONE A ROTA DE HISTÓRICO AQUI:
router.get('/:dispenserId/history', authMiddleware, getHistory);

export default router;