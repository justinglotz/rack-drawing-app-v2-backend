// Output structure that maps to Prisma PullsheetItem model
interface ParsedPullsheetItem {
  flexResourceId: string;
  flexSection: string;
  name: string;
  quantity: number;
  rackUnits: number; // defaults to 0 if not detected
  notes: string | null;
  parentflexResourceId: string | null; // reference to parent item's flexResourceId
}

interface ParsedRackDrawing {
  name: string;
  totalSpaces: number;
  isDoubleWide: boolean;
  flexSection: string;
  notes: string | null;
  equipment: ParsedPullsheetItem[]; // flat list, children have parentflexResourceId set
}

interface ParsedData {
  job: {
    name: string;
  };
  rackDrawings: ParsedRackDrawing[];
  looseEquipment: ParsedPullsheetItem[]; // flat list with flexSection on each item
}

function parseFlexData(data: any): ParsedData {
  const result: ParsedData = {
    job: {
      name: ''
    },
    rackDrawings: [],
    looseEquipment: [],
  };

  if (!Array.isArray(data) || data.length === 0) {
    return { job: { name: '' }, rackDrawings: [], looseEquipment: [] };
  }

  for (const section of data) {
    const sectionName = section.name; // "FOH", "MON", etc.

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
      // This is a rack - extract it with its equipment as flat list
      result.rackDrawings.push({
        name: item.name,
        totalSpaces: extractSpaces(item.name) ?? 0,
        isDoubleWide: item.name.toLowerCase().includes('doublewide'),
        flexSection: section,
        notes: item.note ?? null,
        equipment: flattenEquipment(item.children ?? [], section, null),
      });
    } else if (item.children?.length) {
      // Not a rack but has children
      // If it's a virtual package (grouping), just recurse
      // If it's real equipment with sub-items, flatten with parent reference
      if (item.isVirtual) {
        findItems(item.children, section, result);
      } else {
        // Real equipment with nested items - add parent and children as flat list
        const flatItems = flattenEquipment([item], section, null);
        result.looseEquipment.push(...flatItems);
      }
    } else {
      // Leaf item not inside a rack - it's loose equipment
      result.looseEquipment.push({
        flexResourceId: item.resourceId,
        flexSection: section,
        name: item.name,
        quantity: item.quantity ?? 1,
        rackUnits: extractRackUnits(item.name) ?? 0,
        notes: item.note ?? null,
        parentflexResourceId: null,
      });
    }
  }
}

// Flatten nested equipment into a flat array with parentflexResourceId references
function flattenEquipment(
  items: any[],
  section: string,
  parentflexResourceId: string | null
): ParsedPullsheetItem[] {
  const result: ParsedPullsheetItem[] = [];

  for (const item of items) {
    if (isRack(item.name)) continue; // Skip nested racks

    result.push({
      flexResourceId: item.resourceId,
      flexSection: section,
      name: item.name,
      quantity: item.quantity ?? 1,
      rackUnits: extractRackUnits(item.name) ?? 0,
      notes: item.note ?? null,
      parentflexResourceId,
    });

    // Recursively flatten children with this item as parent
    if (item.children?.length) {
      result.push(...flattenEquipment(item.children, section, item.resourceId));
    }
  }

  return result;
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
export type { ParsedData, ParsedPullsheetItem, ParsedRackDrawing };
