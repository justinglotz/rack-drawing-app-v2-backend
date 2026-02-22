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
    const rackDrawingId = Number(id)

    if (!Number.isInteger(rackDrawingId)) {
      res.status(400).json({ error: 'Invalid rack drawing ID' });
      return;
    }

    // Clear all placement data for equipment in this rack
    await prisma.$transaction([
      prisma.pullsheetItem.updateMany({
        where: { rackDrawingId },
        data: {
          rackDrawingId: null,
          side: null,
          startPosition: null,
        }
      }),
      prisma.rackDrawing.delete({
        where: { id: rackDrawingId }
      })
    ])

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rack drawing' });
  }
}
