import { Router } from 'express';
import { importPullsheet } from '../controllers/pullsheetController.js';
import { getUnplacedItems, placeGenericEquipment } from '../controllers/placedEquipmentController.js';

const router = Router();

router.post('/pullsheet/import', importPullsheet);
router.get('/jobs/:jobId/pullsheet-items/unplaced', getUnplacedItems);
router.post('/jobs/:jobId/pullsheet-items/place-generic', placeGenericEquipment);

export default router;
