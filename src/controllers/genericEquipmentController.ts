import { type Request, type Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getGenericEquipment = async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.genericEquipment.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch generic equipment' });
  }
};

export const createGenericEquipment = async (req: Request, res: Response) => {
  try {
    const { name, displayName, category, rackUnits } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required and must be a non-empty string' });
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ error: 'category is required and must be a non-empty string' });
    }

    if (!Number.isInteger(rackUnits) || rackUnits <= 0) {
      return res.status(400).json({ error: 'rackUnits is required and must be a positive integer' });
    }

    const equipment = await prisma.genericEquipment.create({
      data: {
        name: name.trim(),
        displayName: displayName && typeof displayName === 'string' ? displayName.trim() : null,
        category: category.trim(),
        rackUnits,
      },
    });

    res.status(201).json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create generic equipment' });
  }
};
