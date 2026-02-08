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

export const moveEquipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startPosition, side } = req.body;

    const updated = await prisma.pullsheetItem.update({
      where: { id: Number(id) },
      data: { startPosition, side },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to move equipment' });
  }
}
