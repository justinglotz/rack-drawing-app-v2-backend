import { Router } from 'express';
import { getPlacedEquipment } from '../controllers/placedEquipmentController.js';

const router = Router();

router.get('/placed-equipment', getPlacedEquipment);

export default router;
