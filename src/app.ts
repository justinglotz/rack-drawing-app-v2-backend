import express from 'express';
import jobRoutes from './routes/jobRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import genericEquipmentRoutes from './routes/genericEquipmentRoutes.js';
import placedEquipmentRoutes from './routes/placedEquipmentRoutes.js';
import rackDrawingRoutes from './routes/rackDrawingRoutes.js';
import pullsheetRoutes from './routes/pullsheetRoutes.js';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
// Routes at the top get checked first
app.use('/api', pullsheetRoutes);
app.use('/api', equipmentRoutes);
app.use('/api', genericEquipmentRoutes);
app.use('/api', placedEquipmentRoutes);
app.use('/api', jobRoutes);
app.use('/api', rackDrawingRoutes);

export default app;
