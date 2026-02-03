import { type Request, type Response} from 'express';
import { prisma } from '../config/prisma.js';

export const getEquipment = async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.equipment.findMany();
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
}
