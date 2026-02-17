import { jest } from '@jest/globals'
import type { Request, Response } from 'express'

// --- Mock Prisma ---
const mockPrisma = {
  job: {
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
  },
  rackDrawing: {
    create: jest.fn<any>(),
  },
  equipmentCatalog: {
    findMany: jest.fn<any>(),
    createMany: jest.fn<any>(),
  },
  pullsheetItem: {
    create: jest.fn<any>(),
    createMany: jest.fn<any>(),
  },
}

jest.unstable_mockModule('../../config/prisma.js', () => ({
  prisma: mockPrisma,
}))

// --- Mock Prisma client (for instanceof PrismaClientKnownRequestError) ---
class MockPrismaClientKnownRequestError extends Error {
  code: string
  constructor(message: string, { code }: { code: string }) {
    super(message)
    this.code = code
    this.name = 'PrismaClientKnownRequestError'
  }
}

jest.unstable_mockModule('../../../generated/prisma/client.js', () => ({
  Prisma: {
    PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
  },
}))

// --- Mock Flex API Service ---
const mockFetchFlexPullsheetData = jest.fn<any>()

jest.unstable_mockModule('../../services/flexApiService.js', () => ({
  fetchFlexPullsheetData: mockFetchFlexPullsheetData,
}))

// --- Helpers ---

function makeReq(body: Record<string, unknown> = {}): Request {
  return { body } as unknown as Request
}

function makeRes(): Response & { _status: number; _json: unknown } {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) {
      res._status = code
      return res
    },
    json(data: unknown) {
      res._json = data
      return res
    },
  }
  return res as unknown as Response & { _status: number; _json: unknown }
}

const VALID_FLEX_URL =
  'https://spectrum.flexrentalsolutions.com/f5/ui/#equipment-list-scan/abc-123-uuid/prep'

/** Minimal parsed data matching what fetchFlexPullsheetData returns */
const PARSED_DATA = {
  job: { name: 'Test Show 2026' },
  rackDrawings: [
    {
      name: 'FOH 14-Space Rack',
      totalSpaces: 14,
      isDoubleWide: false,
      flexSection: 'FOH',
      notes: null,
      equipment: [
        {
          flexResourceId: 'equip-001',
          name: 'Waves Server 2RU',
          rackUnits: 2,
          quantity: 1,
          notes: null,
          flexSection: 'FOH',
          parentflexResourceId: null,
        },
      ],
    },
  ],
  looseEquipment: [
    {
      flexResourceId: 'equip-002',
      name: 'Shure SM58',
      rackUnits: 0,
      quantity: 4,
      notes: null,
      flexSection: 'FOH',
      parentflexResourceId: null,
    },
  ],
}

/** Sets up mocks for a successful full import flow */
function setupSuccessfulImportMocks() {
  mockPrisma.job.findUnique.mockResolvedValue(null)
  mockFetchFlexPullsheetData.mockResolvedValue(PARSED_DATA)
  mockPrisma.job.create.mockResolvedValue({ id: 1, name: 'Test Show 2026' })
  mockPrisma.rackDrawing.create.mockResolvedValue({ id: 10 })
  mockPrisma.equipmentCatalog.findMany
    .mockResolvedValueOnce([]) // first call: no existing catalog items
    .mockResolvedValueOnce([   // second call: re-fetch after createMany
      { flexResourceId: 'equip-001', id: 100, displayName: 'Waves Server 2RU' },
      { flexResourceId: 'equip-002', id: 101, displayName: 'Shure SM58' },
    ])
  mockPrisma.equipmentCatalog.createMany.mockResolvedValue({ count: 2 })
  mockPrisma.pullsheetItem.create
    .mockResolvedValueOnce({ id: 200, flexResourceId: 'equip-001' })
    .mockResolvedValueOnce({ id: 201, flexResourceId: 'equip-002' })
}

// --- Dynamic import after mocks are registered ---
const { importPullsheet } = await import('../../controllers/pullsheetController.js')

// --- Tests ---

describe('importPullsheet', () => {
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.resetAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- Input validation ---

  it('returns 400 when flexUrl is missing', async () => {
    const res = makeRes()
    await importPullsheet(makeReq({}), res)

    expect(res._status).toBe(400)
    expect(res._json).toEqual({ error: 'flexUrl is required' })
  })

  it('returns 400 when flexUrl is not a valid URL', async () => {
    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: 'not-a-url' }), res)

    expect(res._status).toBe(400)
    expect(res._json).toEqual({ error: 'Invalid Flex URL format' })
  })

  it('returns 400 when URL has no hash path segment', async () => {
    const res = makeRes()
    await importPullsheet(
      makeReq({ flexUrl: 'https://example.com/#equipment-list-scan' }),
      res,
    )

    expect(res._status).toBe(400)
    expect(res._json).toEqual({ error: 'Invalid Flex URL format' })
  })

  // --- Duplicate import guard ---

  it('returns 409 when pullsheet has already been imported', async () => {
    mockPrisma.job.findUnique.mockResolvedValue({ id: 42, flexPullsheetId: 'abc-123-uuid' })

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    expect(res._status).toBe(409)
    expect(res._json).toEqual({
      error: 'This pullsheet has already been imported',
      jobId: 42,
    })
  })

  it('returns 409 on P2002 race condition during job creation', async () => {
    // First findUnique returns null (no existing job)
    mockPrisma.job.findUnique
      .mockResolvedValueOnce(null)
      // Second findUnique (inside the P2002 catch) returns the conflicting job
      .mockResolvedValueOnce({ id: 99 })

    mockFetchFlexPullsheetData.mockResolvedValue(PARSED_DATA)

    // Simulate Prisma unique constraint error using the mocked class
    const prismaError = new MockPrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002' },
    )
    mockPrisma.job.create.mockRejectedValue(prismaError)

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    expect(res._status).toBe(409)
    expect(res._json).toEqual({
      error: 'This pullsheet has already been imported',
      jobId: 99,
    })
  })

  // --- Successful import ---

  it('creates job, racks, catalog entries, and pullsheet items on success', async () => {
    setupSuccessfulImportMocks()

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    expect(res._status).toBe(201)
    expect(res._json).toEqual({
      data: { id: 1, name: 'Test Show 2026' },
      metadata: {
        rackDrawingsCreated: 1,
        pullsheetItemsCreated: 2,
      },
    })

    // Verify key interactions
    expect(mockFetchFlexPullsheetData).toHaveBeenCalledWith('abc-123-uuid')
    expect(mockPrisma.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test Show 2026',
          flexPullsheetId: 'abc-123-uuid',
        }),
      }),
    )
    expect(mockPrisma.rackDrawing.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.pullsheetItem.create).toHaveBeenCalledTimes(2)
  })

  it('links rack equipment to the correct rackDrawingId', async () => {
    setupSuccessfulImportMocks()

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    // Rack equipment should have rackDrawingId: 10
    const rackItemCall = mockPrisma.pullsheetItem.create.mock.calls[0]![0] as any
    expect(rackItemCall.data.rackDrawingId).toBe(10)

    // Loose equipment should have rackDrawingId: null
    const looseItemCall = mockPrisma.pullsheetItem.create.mock.calls[1]![0] as any
    expect(looseItemCall.data.rackDrawingId).toBeNull()
  })

  it('skips catalog createMany when all items already exist', async () => {
    mockPrisma.job.findUnique.mockResolvedValue(null)
    mockFetchFlexPullsheetData.mockResolvedValue(PARSED_DATA)
    mockPrisma.job.create.mockResolvedValue({ id: 1 })
    mockPrisma.rackDrawing.create.mockResolvedValue({ id: 10 })

    // All catalog items already exist
    const existingCatalog = [
      { flexResourceId: 'equip-001', id: 100, displayName: 'Waves Server 2RU' },
      { flexResourceId: 'equip-002', id: 101, displayName: 'Shure SM58' },
    ]
    mockPrisma.equipmentCatalog.findMany
      .mockResolvedValueOnce(existingCatalog)
      .mockResolvedValueOnce(existingCatalog)

    mockPrisma.pullsheetItem.create
      .mockResolvedValueOnce({ id: 200, flexResourceId: 'equip-001' })
      .mockResolvedValueOnce({ id: 201, flexResourceId: 'equip-002' })

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    expect(res._status).toBe(201)
    expect(mockPrisma.equipmentCatalog.createMany).not.toHaveBeenCalled()
  })

  it('creates children via createMany with correct parentId', async () => {
    const dataWithChildren = {
      job: { name: 'Test Show 2026' },
      rackDrawings: [
        {
          name: 'FOH 14-Space Rack',
          totalSpaces: 14,
          isDoubleWide: false,
          flexSection: 'FOH',
          notes: null,
          equipment: [
            {
              flexResourceId: 'stage-001',
              name: 'Stage 64 2RU',
              rackUnits: 2,
              quantity: 1,
              notes: null,
              flexSection: 'FOH',
              parentflexResourceId: null,
            },
            {
              flexResourceId: 'card-001',
              name: 'Input Card',
              rackUnits: 0,
              quantity: 1,
              notes: null,
              flexSection: 'FOH',
              parentflexResourceId: 'stage-001',
            },
          ],
        },
      ],
      looseEquipment: [],
    }

    mockPrisma.job.findUnique.mockResolvedValue(null)
    mockFetchFlexPullsheetData.mockResolvedValue(dataWithChildren)
    mockPrisma.job.create.mockResolvedValue({ id: 1 })
    mockPrisma.rackDrawing.create.mockResolvedValue({ id: 10 })
    mockPrisma.equipmentCatalog.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { flexResourceId: 'stage-001', id: 100, displayName: 'Stage 64 2RU' },
        { flexResourceId: 'card-001', id: 101, displayName: 'Input Card' },
      ])
    mockPrisma.equipmentCatalog.createMany.mockResolvedValue({ count: 2 })
    // Parent item creation returns an id so children can reference it
    mockPrisma.pullsheetItem.create.mockResolvedValue({ id: 500, flexResourceId: 'stage-001' })
    mockPrisma.pullsheetItem.createMany.mockResolvedValue({ count: 1 })

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    expect(res._status).toBe(201)

    // Children should be created via createMany with parentId pointing to the parent
    expect(mockPrisma.pullsheetItem.createMany).toHaveBeenCalledTimes(1)
    const createManyArg = mockPrisma.pullsheetItem.createMany.mock.calls[0]![0] as any
    expect(createManyArg.data).toHaveLength(1)
    expect(createManyArg.data[0].name).toBe('Input Card')
    expect(createManyArg.data[0].parentId).toBe(500)
  })

  it('maps equipment to the correct rack when multiple racks exist', async () => {
    const dataWithTwoRacks = {
      job: { name: 'Test Show 2026' },
      rackDrawings: [
        {
          name: 'FOH 14-Space Rack',
          totalSpaces: 14,
          isDoubleWide: false,
          flexSection: 'FOH',
          notes: null,
          equipment: [
            {
              flexResourceId: 'equip-001',
              name: 'Waves Server 2RU',
              rackUnits: 2,
              quantity: 1,
              notes: null,
              flexSection: 'FOH',
              parentflexResourceId: null,
            },
          ],
        },
        {
          name: 'MON 8-Space Rack',
          totalSpaces: 8,
          isDoubleWide: false,
          flexSection: 'MON',
          notes: null,
          equipment: [
            {
              flexResourceId: 'equip-003',
              name: 'Shure ULXD4 1RU',
              rackUnits: 1,
              quantity: 1,
              notes: null,
              flexSection: 'MON',
              parentflexResourceId: null,
            },
          ],
        },
      ],
      looseEquipment: [],
    }

    mockPrisma.job.findUnique.mockResolvedValue(null)
    mockFetchFlexPullsheetData.mockResolvedValue(dataWithTwoRacks)
    mockPrisma.job.create.mockResolvedValue({ id: 1 })
    // Each rackDrawing.create call returns a different id
    mockPrisma.rackDrawing.create
      .mockResolvedValueOnce({ id: 10 })
      .mockResolvedValueOnce({ id: 20 })
    mockPrisma.equipmentCatalog.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { flexResourceId: 'equip-001', id: 100, displayName: 'Waves Server 2RU' },
        { flexResourceId: 'equip-003', id: 102, displayName: 'Shure ULXD4 1RU' },
      ])
    mockPrisma.equipmentCatalog.createMany.mockResolvedValue({ count: 2 })
    mockPrisma.pullsheetItem.create
      .mockResolvedValueOnce({ id: 200, flexResourceId: 'equip-001' })
      .mockResolvedValueOnce({ id: 202, flexResourceId: 'equip-003' })

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    expect(res._status).toBe(201)
    expect(mockPrisma.rackDrawing.create).toHaveBeenCalledTimes(2)

    // FOH equipment → rack 10, MON equipment → rack 20
    const fohItemCall = mockPrisma.pullsheetItem.create.mock.calls[0]![0] as any
    expect(fohItemCall.data.rackDrawingId).toBe(10)

    const monItemCall = mockPrisma.pullsheetItem.create.mock.calls[1]![0] as any
    expect(monItemCall.data.rackDrawingId).toBe(20)
  })

  it('handles an empty pullsheet with no racks and no equipment', async () => {
    const emptyData = {
      job: { name: 'Empty Show' },
      rackDrawings: [],
      looseEquipment: [],
    }

    mockPrisma.job.findUnique.mockResolvedValue(null)
    mockFetchFlexPullsheetData.mockResolvedValue(emptyData)
    mockPrisma.job.create.mockResolvedValue({ id: 1, name: 'Empty Show' })
    // No catalog items to look up
    mockPrisma.equipmentCatalog.findMany.mockResolvedValue([])

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    expect(res._status).toBe(201)
    expect(res._json).toEqual({
      data: { id: 1, name: 'Empty Show' },
      metadata: {
        rackDrawingsCreated: 0,
        pullsheetItemsCreated: 0,
      },
    })
    expect(mockPrisma.rackDrawing.create).not.toHaveBeenCalled()
    expect(mockPrisma.pullsheetItem.create).not.toHaveBeenCalled()
    expect(mockPrisma.equipmentCatalog.createMany).not.toHaveBeenCalled()
  })

  it('returns jobId as null when P2002 race occurs but conflicting job is not found', async () => {
    mockPrisma.job.findUnique
      .mockResolvedValueOnce(null)    // initial check: no duplicate
      .mockResolvedValueOnce(null)    // inside P2002 catch: still not found (deleted?)

    mockFetchFlexPullsheetData.mockResolvedValue(PARSED_DATA)

    const prismaError = new MockPrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002' },
    )
    mockPrisma.job.create.mockRejectedValue(prismaError)

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    expect(res._status).toBe(409)
    expect(res._json).toEqual({
      error: 'This pullsheet has already been imported',
      jobId: null,
    })
  })

  // --- Error handling ---

  it('returns 500 when fetchFlexPullsheetData throws', async () => {
    mockPrisma.job.findUnique.mockResolvedValue(null)
    mockFetchFlexPullsheetData.mockRejectedValue(new Error('Flex API down'))

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    expect(res._status).toBe(500)
    expect(res._json).toEqual({ error: 'Failed to import pullsheet' })
  })

  it('returns 500 when a non-P2002 Prisma error occurs', async () => {
    mockPrisma.job.findUnique.mockResolvedValue(null)
    mockFetchFlexPullsheetData.mockResolvedValue(PARSED_DATA)
    mockPrisma.job.create.mockRejectedValue(new Error('Connection lost'))

    const res = makeRes()
    await importPullsheet(makeReq({ flexUrl: VALID_FLEX_URL }), res)

    expect(res._status).toBe(500)
    expect(res._json).toEqual({ error: 'Failed to import pullsheet' })
  })
})
