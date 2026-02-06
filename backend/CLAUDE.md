# Rack Drawing App - Backend

## Overview

This is the backend for a rack drawing application that helps audio engineers plan and visualize equipment placement in road cases/racks for live events. The app integrates with Flex (an external rental management system) to import pullsheet data.

## Database Models

### EquipmentCatalog
A **global lookup table** for equipment display names. Not tied to any specific job.

- `flexResourceId` - Stable ID from Flex (same equipment type always has same ID)
- `name` - Raw name from Flex for matching
- `displayName` - Curated display name for UI
- `rackUnits` - Default rack unit height
- `isStandardItem` - True for user-added items like blanks, rack doors
- `excludeFromRackDrawings` - True for items that never go in racks (consoles, speakers, etc.)

### PullsheetItem
A **job-specific equipment instance** from a Flex pullsheet. Can be placed in a rack or unplaced.

- `jobId` - Required link to the job
- `equipmentCatalogId` - Optional link to catalog for display name lookup
- `rackDrawingId` - Optional link to rack (null = unplaced, shows in sidebar)
- `parentId` - For nested equipment (e.g., Stage 64 containing input/output modules)
- `side`, `startPosition` - Placement within rack (only relevant when placed)

### RackDrawing
A rack/road case that equipment can be placed into.

- `jobId` - Which job this rack belongs to
- `totalSpaces` - Number of rack units (e.g., 14 for a 14-space rack)
- `isDoubleWide` - For double-wide racks with left/right sides
- `flexSection` - Which section (FOH, MON, etc.)

### Job
A show/event imported from a Flex pullsheet.

- `flexPullsheetId` - The Flex pullsheet UUID
- `name` - Job name from Flex

## Data Flow

### 1. Flex API Integration

```
Flex Pullsheet API → flexApiService.ts → Raw JSON
```

The `fetchFlexPullsheetData()` function fetches hierarchical equipment data from Flex.

### 2. Parsing

```
Raw JSON → flexParser.ts → ParsedData
```

The parser:
- Extracts job name from `upstreamLink.elementName`
- Detects racks via `isRack()` (name contains "rack" AND "space")
- Extracts rack size via `extractSpaces()` (e.g., "14-Space" → 14)
- Separates equipment inside racks from loose equipment
- Preserves nested equipment hierarchy (parent/children)
- Extracts rack units via `extractRackUnits()` (e.g., "10RU" → 10)

### 3. Database Import

```
ParsedData → Import Service → Database
```

Import creates:
1. **Job** from pullsheet metadata
2. **RackDrawings** for each rack found
3. **PullsheetItems** for all equipment:
   - Equipment inside racks → `rackDrawingId` set (pre-placed)
   - Loose equipment → `rackDrawingId: null` (unplaced)
4. **Catalog lookups** for display names

### 4. User Workflow

```
Unplaced Items (sidebar) → Drag & Drop → Placed in Rack
```

- **View unplaced**: `WHERE rackDrawingId IS NULL`
- **Place item**: Update `rackDrawingId`, `side`, `startPosition`
- **Unplace item**: Set `rackDrawingId`, `side`, `startPosition` to null
- **View rack contents**: Include pullsheetItems where `rackDrawingId` matches

## Key Queries

### Get unplaced items for a job (excluding non-rack items)
```typescript
prisma.pullsheetItem.findMany({
  where: {
    jobId,
    rackDrawingId: null,
    parentId: null,
    OR: [
      { equipmentCatalog: null },
      { equipmentCatalog: { excludeFromRackDrawings: false } }
    ]
  },
  include: { equipmentCatalog: true, children: true }
})
```

### Get rack with placed items
```typescript
prisma.rackDrawing.findUnique({
  where: { id: rackId },
  include: {
    pullsheetItems: {
      where: { parentId: null },
      include: {
        equipmentCatalog: true,
        children: { include: { equipmentCatalog: true } }
      }
    }
  }
})
```

### Place an item in a rack
```typescript
prisma.pullsheetItem.update({
  where: { id: itemId },
  data: { rackDrawingId: rack.id, side: "FRONT", startPosition: 5 }
})
```

## File Structure

```
src/
  services/
    flexApiService.ts  - Flex API client
    flexParser.ts      - Parse Flex JSON to structured data
  scripts/
    testFlexParser.ts  - Test script for parser
prisma/
  schema.prisma        - Database schema
```

## Environment Variables

- `FLEX_BASE_API_URL` - Base URL for Flex API
- `FLEX_API_KEY` - Auth token for Flex API
- `DATABASE_URL` - PostgreSQL connection string
