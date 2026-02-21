import { jest } from '@jest/globals'
import type { Request, Response } from 'express'

// --- Mock Prisma ---
const mockPrisma = {
  pullsheetItem: {
    findMany: jest.fn<any>(),
    update: jest.fn<any>(),
  },
}

jest.unstable_mockModule('../../config/prisma.js', () => ({
  prisma: mockPrisma,
}))

// --- Helpers ---

function makeReq(body: Record<string, unknown> = {}, params: Record<string, any> = {}): Request {
  return { body, params } as unknown as Request
}

function makeRes(): Response & { _status: number; _json: unknown; _sent: boolean } {
  const res = {
    _status: 200,
    _json: null as unknown,
    _sent: false,
    status(code: number) {
      res._status = code
      return res
    },
    json(data: unknown) {
      res._json = data
      return res
    },
    send() {
      res._sent = true
      return res
    },
  }
  return res as unknown as Response & { _status: number; _json: unknown; _sent: boolean }
}

// --- Dynamic import after mocks are registered ---
const { getPlacedEquipment, moveEquipment, updateEquipmentName } = await import(
  '../../controllers/placedEquipmentController.js'
)

// --- Tests ---

describe('Placed Equipment Controller', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('getPlacedEquipment', () => {
    it('returns all placed equipment', async () => {
      const mockEquipment = [
        {
          id: 1,
          jobId: 1,
          rackDrawingId: 10,
          name: 'Waves Server 2RU',
          displayNameOverride: null,
          rackUnits: 2,
          side: 'FRONT',
          startPosition: 1,
        },
        {
          id: 2,
          jobId: 1,
          rackDrawingId: null,
          name: 'Shure SM58',
          displayNameOverride: null,
          rackUnits: 0,
          side: null,
          startPosition: null,
        },
      ]
      mockPrisma.pullsheetItem.findMany.mockResolvedValue(mockEquipment)

      const res = makeRes()
      await getPlacedEquipment(makeReq(), res)

      expect(res._status).toBe(200)
      expect(res._json).toEqual(mockEquipment)
      expect(mockPrisma.pullsheetItem.findMany).toHaveBeenCalled()
    })

    it('returns empty array when no equipment exists', async () => {
      mockPrisma.pullsheetItem.findMany.mockResolvedValue([])

      const res = makeRes()
      await getPlacedEquipment(makeReq(), res)

      expect(res._status).toBe(200)
      expect(res._json).toEqual([])
    })

    it('returns 500 on database error', async () => {
      mockPrisma.pullsheetItem.findMany.mockRejectedValue(new Error('Database error'))

      const res = makeRes()
      await getPlacedEquipment(makeReq(), res)

      expect(res._status).toBe(500)
      expect(res._json).toEqual({ error: 'Failed to fetch placed equipment' })
    })
  })

  describe('moveEquipment', () => {
    describe('moving to unplaced (rackDrawingId: null)', () => {
      it('clears placement data when moving to unplaced', async () => {
        const unplacedItem = {
          id: 1,
          jobId: 1,
          rackDrawingId: null,
          name: 'Waves Server 2RU',
          rackUnits: 2,
          side: null,
          startPosition: null,
        }
        mockPrisma.pullsheetItem.update.mockResolvedValue(unplacedItem)

        const res = makeRes()
        await moveEquipment(makeReq({ rackDrawingId: null }, { id: '1' }), res)

        expect(res._status).toBe(200)
        expect(res._json).toEqual(unplacedItem)
        expect(mockPrisma.pullsheetItem.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            rackDrawingId: null,
            side: null,
            startPosition: null,
          },
        })
      })
    })

    describe('moving into a rack (rackDrawingId provided)', () => {
      it('places equipment in a rack with position and side', async () => {
        const placedItem = {
          id: 1,
          jobId: 1,
          rackDrawingId: 10,
          name: 'Waves Server 2RU',
          rackUnits: 2,
          side: 'FRONT',
          startPosition: 1,
        }
        mockPrisma.pullsheetItem.update.mockResolvedValue(placedItem)

        const res = makeRes()
        await moveEquipment(
          makeReq({ rackDrawingId: 10, side: 'FRONT', startPosition: 1 }, { id: '1' }),
          res,
        )

        expect(res._status).toBe(200)
        expect(res._json).toEqual(placedItem)
        expect(mockPrisma.pullsheetItem.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            rackDrawingId: 10,
            side: 'FRONT',
            startPosition: 1,
          },
        })
      })

      it('returns 400 when startPosition is missing', async () => {
        const res = makeRes()
        await moveEquipment(makeReq({ rackDrawingId: 10, side: 'FRONT' }, { id: '1' }), res)

        expect(res._status).toBe(400)
        expect(res._json).toEqual({
          error: 'startPosition and side are required when placing equipment in a rack',
        })
        expect(mockPrisma.pullsheetItem.update).not.toHaveBeenCalled()
      })

      it('returns 400 when side is missing', async () => {
        const res = makeRes()
        await moveEquipment(makeReq({ rackDrawingId: 10, startPosition: 1 }, { id: '1' }), res)

        expect(res._status).toBe(400)
        expect(res._json).toEqual({
          error: 'startPosition and side are required when placing equipment in a rack',
        })
        expect(mockPrisma.pullsheetItem.update).not.toHaveBeenCalled()
      })

      it('returns 400 when both startPosition and side are missing', async () => {
        const res = makeRes()
        await moveEquipment(makeReq({ rackDrawingId: 10 }, { id: '1' }), res)

        expect(res._status).toBe(400)
        expect(res._json).toEqual({
          error: 'startPosition and side are required when placing equipment in a rack',
        })
        expect(mockPrisma.pullsheetItem.update).not.toHaveBeenCalled()
      })

      it('supports different side values', async () => {
        const sidesAndBackItem = {
          id: 1,
          jobId: 1,
          rackDrawingId: 10,
          name: 'Equipment',
          rackUnits: 1,
          side: 'BACK_LEFT',
          startPosition: 2,
        }
        mockPrisma.pullsheetItem.update.mockResolvedValue(sidesAndBackItem)

        const res = makeRes()
        await moveEquipment(
          makeReq({ rackDrawingId: 10, side: 'BACK_LEFT', startPosition: 2 }, { id: '1' }),
          res,
        )

        expect(mockPrisma.pullsheetItem.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            rackDrawingId: 10,
            side: 'BACK_LEFT',
            startPosition: 2,
          },
        })
      })
    })

    describe('moving within a rack (rackDrawingId not provided)', () => {
      it('updates position and side within same rack', async () => {
        const movedItem = {
          id: 1,
          jobId: 1,
          rackDrawingId: 10,
          name: 'Waves Server 2RU',
          rackUnits: 2,
          side: 'BACK',
          startPosition: 5,
        }
        mockPrisma.pullsheetItem.update.mockResolvedValue(movedItem)

        const res = makeRes()
        await moveEquipment(
          makeReq({ side: 'BACK', startPosition: 5 }, { id: '1' }),
          res,
        )

        expect(res._status).toBe(200)
        expect(res._json).toEqual(movedItem)
        expect(mockPrisma.pullsheetItem.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            side: 'BACK',
            startPosition: 5,
          },
        })
      })

      it('only updates position if side is not provided', async () => {
        const movedItem = {
          id: 1,
          jobId: 1,
          rackDrawingId: 10,
          name: 'Equipment',
          rackUnits: 1,
          side: 'FRONT',
          startPosition: 3,
        }
        mockPrisma.pullsheetItem.update.mockResolvedValue(movedItem)

        const res = makeRes()
        await moveEquipment(
          makeReq({ startPosition: 3 }, { id: '1' }),
          res,
        )

        expect(mockPrisma.pullsheetItem.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            startPosition: 3,
          },
        })
      })

      it('only updates side if position is not provided', async () => {
        const movedItem = {
          id: 1,
          jobId: 1,
          rackDrawingId: 10,
          name: 'Equipment',
          rackUnits: 1,
          side: 'BACK',
          startPosition: 1,
        }
        mockPrisma.pullsheetItem.update.mockResolvedValue(movedItem)

        const res = makeRes()
        await moveEquipment(
          makeReq({ side: 'BACK' }, { id: '1' }),
          res,
        )

        expect(mockPrisma.pullsheetItem.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            side: 'BACK',
          },
        })
      })
    })

    it('returns 500 on database error', async () => {
      mockPrisma.pullsheetItem.update.mockRejectedValue(new Error('Database error'))

      const res = makeRes()
      await moveEquipment(makeReq({ rackDrawingId: 10, side: 'FRONT', startPosition: 1 }, { id: '1' }), res)

      expect(res._status).toBe(500)
      expect(res._json).toEqual({ error: 'Failed to move equipment' })
    })
  })

  describe('updateEquipmentName', () => {
    it('updates display name override', async () => {
      const updatedItem = {
        id: 1,
        jobId: 1,
        name: 'Waves Server 2RU',
        displayNameOverride: 'Custom Server Name',
        rackUnits: 2,
      }
      mockPrisma.pullsheetItem.update.mockResolvedValue(updatedItem)

      const res = makeRes()
      await updateEquipmentName(
        makeReq({ displayNameOverride: 'Custom Server Name' }, { id: '1' }),
        res,
      )

      expect(res._status).toBe(200)
      expect(res._json).toEqual(updatedItem)
      expect(mockPrisma.pullsheetItem.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { displayNameOverride: 'Custom Server Name' },
      })
    })

    it('returns 400 when displayNameOverride is missing', async () => {
      const res = makeRes()
      await updateEquipmentName(makeReq({}, { id: '1' }), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({
        error: 'displayNameOverride must be a non-empty string',
      })
      expect(mockPrisma.pullsheetItem.update).not.toHaveBeenCalled()
    })

    it('returns 400 when displayNameOverride is empty string', async () => {
      const res = makeRes()
      await updateEquipmentName(
        makeReq({ displayNameOverride: '' }, { id: '1' }),
        res,
      )

      expect(res._status).toBe(400)
      expect(res._json).toEqual({
        error: 'displayNameOverride must be a non-empty string',
      })
      expect(mockPrisma.pullsheetItem.update).not.toHaveBeenCalled()
    })

    it('returns 400 when displayNameOverride is not a string', async () => {
      const res = makeRes()
      await updateEquipmentName(
        makeReq({ displayNameOverride: 123 }, { id: '1' }),
        res,
      )

      expect(res._status).toBe(400)
      expect(res._json).toEqual({
        error: 'displayNameOverride must be a non-empty string',
      })
      expect(mockPrisma.pullsheetItem.update).not.toHaveBeenCalled()
    })

    it('returns 400 when displayNameOverride is null', async () => {
      const res = makeRes()
      await updateEquipmentName(
        makeReq({ displayNameOverride: null }, { id: '1' }),
        res,
      )

      expect(res._status).toBe(400)
      expect(res._json).toEqual({
        error: 'displayNameOverride must be a non-empty string',
      })
      expect(mockPrisma.pullsheetItem.update).not.toHaveBeenCalled()
    })

    it('returns 400 when displayNameOverride is undefined', async () => {
      const res = makeRes()
      await updateEquipmentName(
        makeReq({ displayNameOverride: undefined }, { id: '1' }),
        res,
      )

      expect(res._status).toBe(400)
      expect(res._json).toEqual({
        error: 'displayNameOverride must be a non-empty string',
      })
      expect(mockPrisma.pullsheetItem.update).not.toHaveBeenCalled()
    })

    it('returns 500 on database error', async () => {
      mockPrisma.pullsheetItem.update.mockRejectedValue(new Error('Database error'))

      const res = makeRes()
      await updateEquipmentName(
        makeReq({ displayNameOverride: 'New Name' }, { id: '1' }),
        res,
      )

      expect(res._status).toBe(500)
      expect(res._json).toEqual({ error: 'Failed to update equipment name' })
    })

    it('handles special characters in display name', async () => {
      const updatedItem = {
        id: 1,
        jobId: 1,
        name: 'Equipment',
        displayNameOverride: 'FOH Rack #1 (Main) - Custom & Modified!',
        rackUnits: 1,
      }
      mockPrisma.pullsheetItem.update.mockResolvedValue(updatedItem)

      const res = makeRes()
      await updateEquipmentName(
        makeReq({ displayNameOverride: 'FOH Rack #1 (Main) - Custom & Modified!' }, { id: '1' }),
        res,
      )

      expect(res._status).toBe(200)
      expect(mockPrisma.pullsheetItem.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { displayNameOverride: 'FOH Rack #1 (Main) - Custom & Modified!' },
      })
    })
  })
})
