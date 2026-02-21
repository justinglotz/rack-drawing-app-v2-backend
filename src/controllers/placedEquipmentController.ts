import { type Request, type Response} from 'express';
import { prisma } from '../config/prisma.js';

export const getPlacedEquipment = async (req: Request, res: Response) => {
  try {
    const placedEquipment = await prisma.pullsheetItem.findMany();
    res.status(200).json(placedEquipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch placed equipment' });
  }
}

export const moveEquipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const equipmentId = Number(id);
    const { rackDrawingId, startPosition, side } = req.body;

    if (!Number.isInteger(equipmentId)) {
      res.status(400).json({ error: 'Invalid equipment ID' });
      return;
    }

    // If moving to unplaced (rackDrawingId is null), clear position data
    if (rackDrawingId === null) {
      const updated = await prisma.pullsheetItem.update({
        where: { id: equipmentId },
        data: {
          rackDrawingId: null,
          startPosition: null,
          side: null,
        },
      });
      res.status(200).json(updated);
      return;
    }

    // If rackDrawingId is provided, require startPosition and side
    if (rackDrawingId !== undefined) {
      if (startPosition === null || side === null) {
        res.status(400).json({ error: 'startPosition and side are required when placing equipment in a rack' });
        return;
      }

      const updated = await prisma.pullsheetItem.update({
        where: { id: equipmentId },
        data: { rackDrawingId, startPosition, side },
      });
      res.status(200).json(updated);
      return;
    }

    // If only moving within a rack (rackDrawingId not provided), just update position
    const updated = await prisma.pullsheetItem.update({
      where: { id: equipmentId },
      data: { startPosition, side },
    });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to move equipment' });
  }
}

export const updateEquipmentName = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const equipmentId = Number(id);
    if (!Number.isInteger(equipmentId)) {
      res.status(400).json({ error: 'Equipment ID must be a number' });
    }

    const { displayNameOverride } = req.body;
    if (!displayNameOverride || typeof displayNameOverride !== 'string') {
      res.status(400).json({ error: 'displayNameOverride must be a non-empty string' });
      return;
    }

    const updated = await prisma.pullsheetItem.update({
      where: { id: equipmentId },
      data: { displayNameOverride },
    });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update equipment name' });
  }
}
