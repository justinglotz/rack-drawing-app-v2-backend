import { Router } from 'express';
import { importPullsheet } from '../controllers/pullsheetController.js';
const router = Router();

router.post('/pullsheet/import', importPullsheet);

export default router;
