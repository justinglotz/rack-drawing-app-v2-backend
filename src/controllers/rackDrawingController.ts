import { type Request, type Response} from 'express';
import { prisma } from '../config/prisma.js';

export const getRackDrawings = async (req: Request, res: Response) => {
  try {
    const rackDrawings = await prisma.rackDrawing.findMany();
    res.status(200).json(rackDrawings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rack drawings' });
  }
}

export const deleteRackDrawing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Rack drawing ID is required' });
      return;
    }

    // Clear all placement data for equipment in this rack
    await prisma.pullsheetItem.updateMany({
      where: { rackDrawingId: Number(id) },
      data: {
        rackDrawingId: null,
        side: null,
        startPosition: null,
      },
    });

    // Delete the rack drawing
    await prisma.rackDrawing.delete({
      where: { id: Number(id) },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rack drawing' });
  }
}
