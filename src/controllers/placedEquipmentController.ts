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
      if (startPosition == null || side == null) {
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

export const getUnplacedItems = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const id = Number(jobId);

    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'Invalid job ID' });
      return;
    }

    const unplacedItems = await prisma.pullsheetItem.findMany({
      where: {
        jobId: id,
        rackDrawingId: null,
      },
    });

    res.status(200).json(unplacedItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unplaced items' });
  }
}

export const placeGenericEquipment = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const jobIdNum = Number(jobId);

    if (!Number.isInteger(jobIdNum)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const { genericEquipmentId, rackDrawingId, quantity, startPosition, side } = req.body;

    // Validate genericEquipmentId
    if (!Number.isInteger(genericEquipmentId) || genericEquipmentId <= 0) {
      return res.status(400).json({ error: 'genericEquipmentId is required and must be a positive integer' });
    }

    // Validate rackDrawingId
    if (!Number.isInteger(rackDrawingId) || rackDrawingId <= 0) {
      return res.status(400).json({ error: 'rackDrawingId is required and must be a positive integer' });
    }

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'quantity is required and must be a positive integer' });
    }

    // Validate startPosition
    if (!Number.isInteger(startPosition) || startPosition < 0) {
      return res.status(400).json({ error: 'startPosition is required and must be a non-negative integer' });
    }

    // Validate side
    const validSides = ['FRONT', 'BACK', 'FRONT_LEFT', 'FRONT_RIGHT', 'BACK_LEFT', 'BACK_RIGHT'];
    if (!side || !validSides.includes(side)) {
      return res.status(400).json({ error: 'side is required and must be a valid value' });
    }

    // Look up GenericEquipment
    const genericEquipment = await prisma.genericEquipment.findUnique({
      where: { id: genericEquipmentId },
    });

    if (!genericEquipment) {
      return res.status(404).json({ error: 'Generic equipment not found' });
    }

    // Create PullsheetItem with snapshot of generic equipment data
    const pullsheetItem = await prisma.pullsheetItem.create({
      data: {
        jobId: jobIdNum,
        genericEquipmentId,
        name: genericEquipment.name,
        rackUnits: genericEquipment.rackUnits,
        quantity,
        rackDrawingId,
        startPosition,
        side,
        isFromPullsheet: false,
        flexResourceId: '',
        flexSection: 'Generic',
      },
    });

    res.status(201).json(pullsheetItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to place generic equipment' });
  }
}
