import { type Request, type Response} from 'express';
import { prisma } from '../config/prisma.js';

export const getRackDrawings = async (req: Request, res: Response) => {
  try {
    const rackDrawings = await prisma.rackDrawing.findMany();
    res.json(rackDrawings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rack drawings' });
  }
}
