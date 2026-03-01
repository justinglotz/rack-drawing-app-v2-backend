import { prisma } from '../src/config/prisma.js';

const genericEquipmentData = [
  { name: '6U Vent Door', category: 'Vent Doors', rackUnits: 6 },
  { name: '4U Vent Door', category: 'Vent Doors', rackUnits: 4 },
  { name: '3U Vent Door', category: 'Vent Doors', rackUnits: 3 },
  { name: '2U Vent Door', category: 'Vent Doors', rackUnits: 2 },
  { name: '3U Vent Blank', category: 'Vent Blanks', rackUnits: 3 },
  { name: '2U Vent Blank', category: 'Vent Blanks', rackUnits: 2 },
  { name: '1U Vent Blank', category: 'Vent Blanks', rackUnits: 1 },
  { name: '3U Blank', category: 'Blanks', rackUnits: 3 },
  { name: '2U Blank', category: 'Blanks', rackUnits: 2 },
  { name: '1U Blank', category: 'Blanks', rackUnits: 1 },
  { name: '2U Drawer', category: 'Drawers', rackUnits: 2 },
  { name: '3U Drawer', category: 'Drawers', rackUnits: 3 },
  { name: '4U Drawer', category: 'Drawers', rackUnits: 4 },
];

async function main() {
  console.log('Seeding generic equipment...');

  for (const item of genericEquipmentData) {
    await prisma.genericEquipment.upsert({
      where: { name: item.name },
      update: {},
      create: {
        name: item.name,
        category: item.category,
        rackUnits: item.rackUnits,
        isActive: true,
      },
    });
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
