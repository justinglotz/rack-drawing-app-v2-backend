import { Router } from 'express';
import { getEquipment } from '../controllers/equipmentController.js';

const router = Router();

router.get('/equipment', getEquipment);

export default router;
