import { Router } from 'express';
import { getNearbyPharmacies } from '../controllers/pharmacyController';

const router = Router();

router.get('/', getNearbyPharmacies);

export default router;

