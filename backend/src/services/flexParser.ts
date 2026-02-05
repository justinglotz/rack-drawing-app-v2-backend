// Output structure that maps to your Prisma models
interface EquipmentItem {
  flexLineId: string;
  name: string;
  quantity: number;
  rackUnits: number | null;
  notes: string | null;
  children?: EquipmentItem[];
}

interface ParsedData {
  job: {
    name: string;
  };
  rackDrawings: {
    name: string;
    totalSpaces: number;
    isDoubleWide: boolean;
    flexSection: string;
    notes: string | null;
    equipment: EquipmentItem[];
  }[];
  looseEquipment: {
    [section: string]: EquipmentItem[];
  };
}

function parseFlexData(data: any): ParsedData {
  const result: ParsedData = {
    job: {
      name: ''
    },
    rackDrawings: [],
    looseEquipment: {},
  };

  if (!Array.isArray(data) || data.length === 0) {
    return { job: { name: '' }, rackDrawings: [], looseEquipment: {} };
  }

  for (const section of data) {
    const sectionName = section.name; // "FOH", "MON", etc.

    // Initialize loose equipment array for this section
    result.looseEquipment[sectionName] = [];

    // Get job name from first section's upstreamLink
    if (!result.job.name && section.upstreamLink?.elementName) {
      result.job.name = section.upstreamLink.elementName;
    }

    // Find racks and loose equipment in this section
    findItems(section.children ?? [], sectionName, result);
  }

  return result;
}

function findItems(items: any[], section: string, result: ParsedData): void {
  for (const item of items) {
    if (isRack(item.name)) {
      // This is a rack - extract it with its equipment (preserving nesting)
      result.rackDrawings.push({
        name: item.name,
        totalSpaces: extractSpaces(item.name) ?? 0,
        isDoubleWide: item.name.toLowerCase().includes('doublewide'),
        flexSection: section,
        notes: item.note ?? null,
        equipment: buildEquipmentTree(item.children ?? []),
      });
    } else if (item.children?.length) {
      // Not a rack but has children
      // If it's a virtual package (grouping), just recurse
      // If it's real equipment with sub-items, add it with nested structure
      if (item.isVirtual) {
        findItems(item.children, section, result);
      } else {
        // Real equipment with nested items - preserve the tree structure
        if (!result.looseEquipment[section]) {
          result.looseEquipment[section] = [];
        }
        result.looseEquipment[section].push(buildEquipmentItem(item));
      }
    } else {
      // Leaf item not inside a rack - it's loose equipment
      if (!result.looseEquipment[section]) {
        result.looseEquipment[section] = [];
      }
      result.looseEquipment[section].push({
        flexLineId: item.id,
        name: item.name,
        quantity: item.quantity ?? 1,
        rackUnits: extractRackUnits(item.name),
        notes: item.note ?? null,
      });
    }
  }
}

function buildEquipmentItem(item: any): EquipmentItem {
  const equipment: EquipmentItem = {
    flexLineId: item.id,
    name: item.name,
    quantity: item.quantity ?? 1,
    rackUnits: extractRackUnits(item.name),
    notes: item.note ?? null,
  };

  if (item.children?.length) {
    equipment.children = buildEquipmentTree(item.children);
  }

  return equipment;
}

function buildEquipmentTree(items: any[]): EquipmentItem[] {
  const equipment: EquipmentItem[] = [];

  for (const item of items) {
    if (isRack(item.name)) continue; // Skip nested racks
    equipment.push(buildEquipmentItem(item));
  }

  return equipment;
}

function isRack(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('rack') && lower.includes('space');
}

function extractSpaces(name: string): number | null {
  const match = name.match(/(\d+)[-\s]?space/i);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

function extractRackUnits(name: string): number | null {
  // Match patterns like "10RU", "1RU", "1 RU", "- 1RU", "1-RU"
  const match = name.match(/(\d+)[-\s]?ru\b/i);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

export { parseFlexData };
export type { ParsedData, EquipmentItem };
