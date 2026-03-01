import { Router } from 'express';
import { getGenericEquipment, createGenericEquipment } from '../controllers/genericEquipmentController.js';

const router = Router();

router.get('/generic-equipment', getGenericEquipment);
router.post('/generic-equipment', createGenericEquipment);

export default router;
