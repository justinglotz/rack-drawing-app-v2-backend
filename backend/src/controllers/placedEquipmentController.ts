import { type Request, type Response} from 'express';
import { prisma } from '../config/prisma.js';

export const getPlacedEquipment = async (req: Request, res: Response) => {
  try {
    const placedEquipment = await prisma.pullsheetItem.findMany();
    res.json(placedEquipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch placed equipment' });
  }
}
