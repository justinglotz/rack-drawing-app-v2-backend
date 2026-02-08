import { Router } from 'express';
import { getRackDrawings } from '../controllers/rackDrawingController.js';

const router = Router();

router.get('/rack-drawings', getRackDrawings);

export default router;
