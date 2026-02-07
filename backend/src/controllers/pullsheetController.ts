import { type Request, type Response } from 'express';
import { prisma } from '../config/prisma.js';
import { fetchFlexPullsheetData } from '../services/flexApiService.js';
import type { ParsedPullsheetItem } from '../services/flexParser.js';

export const importPullsheet = async (req: Request, res: Response) => {
  try {
    const { pullsheetId } = req.body;

    if (!pullsheetId) {
      return res.status(400).json({ error: 'pullsheetId is required' });
    }

    const parsedData = await fetchFlexPullsheetData(pullsheetId);

    // 1. Create Job
    const job = await prisma.job.create({
      data: {
        name: parsedData.job.name,
        flexPullsheetId: pullsheetId,
      },
    });

    // 2. Create RackDrawings in parallel
    const rackPromise = Promise.all(
      parsedData.rackDrawings.map(async (rack) => {
        const rackDrawing = await prisma.rackDrawing.create({
          data: {
            jobId: job.id,
            name: rack.name,
            totalSpaces: rack.totalSpaces,
            isDoubleWide: rack.isDoubleWide,
            flexSection: rack.flexSection,
            notes: rack.notes,
          },
        });
        return { name: rack.name, id: rackDrawing.id };
      })
    );

    const rackResults = await rackPromise;
    const rackIdMap = new Map(rackResults.map(r => [r.name, r.id]));

    // 3. Collect all equipment items (from racks and loose)
    const allEquipment: Array<ParsedPullsheetItem & { rackDrawingId: number | null }> = [];

    for (const rack of parsedData.rackDrawings) {
      const rackId = rackIdMap.get(rack.name)!;
      for (const item of rack.equipment) {
        allEquipment.push({ ...item, rackDrawingId: rackId });
      }
    }

    for (const item of parsedData.looseEquipment) {
      allEquipment.push({ ...item, rackDrawingId: null });
    }

    // 4. Upsert EquipmentCatalog entries efficiently
    const uniqueResourceIds = [...new Set(allEquipment.map(item => item.flexResourceId))];

    const existingCatalogItems = await prisma.equipmentCatalog.findMany({
      where: { flexResourceId: { in: uniqueResourceIds } },
      select: { flexResourceId: true, id: true }
    });

    const existingIdsSet = new Set(existingCatalogItems.map(c => c.flexResourceId));
    const missingItems = allEquipment.filter(item => !existingIdsSet.has(item.flexResourceId));

    // Deduplicate missing items by flexResourceId for insertion
    const uniqueMissingItemsMap = new Map();
    for (const item of missingItems) {
      if (!uniqueMissingItemsMap.has(item.flexResourceId)) {
        uniqueMissingItemsMap.set(item.flexResourceId, item);
      }
    }
    const nodesToInsert = Array.from(uniqueMissingItemsMap.values());

    if (nodesToInsert.length > 0) {
      await prisma.equipmentCatalog.createMany({
        data: nodesToInsert.map(item => ({
          flexResourceId: item.flexResourceId,
          name: item.name,
          displayName: item.name,
          rackUnits: item.rackUnits || null,
        })),
        skipDuplicates: true,
      });
    }
    // Re-fetch all catalog IDs
    const finalCatalogItems = await prisma.equipmentCatalog.findMany({
      where: { flexResourceId: { in: uniqueResourceIds } },
      select: { flexResourceId: true, id: true }
    });

    const catalogIdMap = new Map(finalCatalogItems.map(c => [c.flexResourceId, c.id]));

    // 5. Create PullsheetItems
    const parents = allEquipment.filter(item => item.parentflexResourceId === null);
    const children = allEquipment.filter(item => item.parentflexResourceId !== null);

    const parentPromises = parents.map(async (item) => {
      const pullsheetItem = await prisma.pullsheetItem.create({
        data: {
          jobId: job.id,
          equipmentCatalogId: catalogIdMap.get(item.flexResourceId) ?? null,
          rackDrawingId: item.rackDrawingId,
          flexResourceId: item.flexResourceId,
          flexSection: item.flexSection,
          name: item.name,
          rackUnits: item.rackUnits,
          quantity: item.quantity,
          notes: item.notes,
        },
      });
      return { flexResourceId: item.flexResourceId, id: pullsheetItem.id };
    });

    const parentResults = await Promise.all(parentPromises);
    const itemIdMap = new Map(parentResults.map(p => [p.flexResourceId, p.id]));

    if (children.length > 0) {
      await prisma.pullsheetItem.createMany({
        data: children.map(item => ({
          jobId: job.id,
          equipmentCatalogId: catalogIdMap.get(item.flexResourceId) ?? null,
          rackDrawingId: item.rackDrawingId,
          parentId: itemIdMap.get(item.parentflexResourceId!) ?? null,
          flexResourceId: item.flexResourceId,
          flexSection: item.flexSection,
          name: item.name,
          rackUnits: item.rackUnits,
          quantity: item.quantity,
          notes: item.notes,
        }))
      });
    }

    res.status(201).json({
      job,
      rackDrawingsCreated: parsedData.rackDrawings.length,
      pullsheetItemsCreated: allEquipment.length,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import pullsheet' });
  }
}
