
import 'dotenv/config';
import { prisma } from '../config/prisma.js';
import type { ParsedPullsheetItem } from '../services/flexParser.js';

const MOCK_PULLSHEET_ID = 'BENCHMARK_TEST_ID';

// Generate a large dataset
const generateLargeDataset = () => {
  const rackDrawings = [];
  const looseEquipment = [];

  // 10 Racks
  for (let i = 0; i < 10; i++) {
    const equipment = [];
    // 20 items per rack
    for (let j = 0; j < 20; j++) {
      equipment.push({
        flexResourceId: `RACK_${i}_ITEM_${j}`,
        flexSection: 'FOH',
        name: `Rack Item ${j}`,
        quantity: 1,
        rackUnits: 1,
        notes: null,
        parentflexResourceId: null,
      });
    }

    rackDrawings.push({
      name: `Rack ${i}`,
      totalSpaces: 20,
      isDoubleWide: false,
      flexSection: 'FOH',
      notes: 'Benchmark Rack',
      equipment: equipment,
    });
  }

  // 50 Loose items
  for (let i = 0; i < 50; i++) {
    looseEquipment.push({
      flexResourceId: `LOOSE_ITEM_${i}`,
      flexSection: 'FOH',
      name: `Loose Item ${i}`,
      quantity: 1,
      rackUnits: 0,
      notes: null,
      parentflexResourceId: null,
    });
  }

  return {
    job: { name: 'Benchmark Job' },
    rackDrawings,
    looseEquipment,
  };
};

async function runImportLogic(parsedData: any, pullsheetId: string) {
  // 1. Create Job
  const job = await prisma.job.create({
    data: {
      name: parsedData.job.name,
      flexPullsheetId: pullsheetId,
    },
  });

  // 2. Create RackDrawings in parallel
  const rackPromise = Promise.all(
    parsedData.rackDrawings.map(async (rack: any) => {
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
  // Fetch all existing items first to avoid one-by-one checks
  const uniqueResourceIds = [...new Set(allEquipment.map(item => item.flexResourceId))];

  // Create any missing catalog items in bulk
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
      data: nodesToInsert.map((item: any) => ({
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

  // Map flexResourceId → PullsheetItem.id for parent lookup
  // Parents must be created and retrieve their IDs. Parallelize this.
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

  // Children can be bulk inserted using createMany!
  // We map their parent flex ID to the real parent ID we just created.
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

  return job;
}

async function runBenchmark() {
  console.log('Starting benchmark...');

  // Cleanup previous run
  await prisma.job.deleteMany({
    where: { flexPullsheetId: MOCK_PULLSHEET_ID }
  });

  const mockData = generateLargeDataset();

  const start = performance.now();
  const job = await runImportLogic(mockData, MOCK_PULLSHEET_ID);
  const end = performance.now();

  console.log(`\nImport took: ${((end - start) / 1000).toFixed(3)} seconds`);

  // Verify counts
  if (job) {
    const rackCount = await prisma.rackDrawing.count({ where: { jobId: job.id } });
    const itemCount = await prisma.pullsheetItem.count({ where: { jobId: job.id } });
    console.log(`Created Job ID: ${job.id}`);
    console.log(`Racks created: ${rackCount}`);
    console.log(`Items created: ${itemCount}`);
  } else {
    console.error('Job was not created!');
  }
}

runBenchmark()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
