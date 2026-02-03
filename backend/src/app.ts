import express from 'express';
import jobRoutes from './routes/jobRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import placedEquipmentRoutes from './routes/placedEquipmentRoutes.js';
import rackDrawingRoutes from './routes/rackDrawingRoutes.js';

const app = express();

// Routes at the top get checked first
app.use(express.json());
app.use('/api', jobRoutes);
app.use('/api', equipmentRoutes);
app.use('/api', placedEquipmentRoutes);
app.use('/api', rackDrawingRoutes);

export default app;
