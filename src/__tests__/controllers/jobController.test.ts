import { jest } from '@jest/globals'
import type { Request, Response } from 'express'

// --- Mock Prisma ---
const mockPrisma = {
  job: {
    findMany: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    delete: jest.fn<any>(),
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
    _status: 200, // Default to 200, but endpoints should set explicitly
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
const { getJobs, createJob, editJob, deleteJob } = await import('../../controllers/jobController.js')

// --- Tests ---

describe('Job Controller', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('getJobs', () => {
    it('returns all jobs', async () => {
      const mockJobs = [
        { id: 1, name: 'Job 1', flexPullsheetId: 'uuid-1', description: null, createdAt: new Date() },
        { id: 2, name: 'Job 2', flexPullsheetId: 'uuid-2', description: 'Test job', createdAt: new Date() },
      ]
      mockPrisma.job.findMany.mockResolvedValue(mockJobs)

      const res = makeRes()
      await getJobs(makeReq(), res)

      expect(res._status).toBe(200)
      expect(res._json).toEqual(mockJobs)
      expect(mockPrisma.job.findMany).toHaveBeenCalled()
    })

    it('returns empty array when no jobs exist', async () => {
      mockPrisma.job.findMany.mockResolvedValue([])

      const res = makeRes()
      await getJobs(makeReq(), res)

      expect(res._status).toBe(200)
      expect(res._json).toEqual([])
    })

    it('returns 500 on database error', async () => {
      mockPrisma.job.findMany.mockRejectedValue(new Error('Database error'))

      const res = makeRes()
      await getJobs(makeReq(), res)

      expect(res._status).toBe(500)
      expect(res._json).toEqual({ error: 'Failed to fetch jobs' })
    })
  })

  describe('createJob', () => {
    it('creates a job with required fields', async () => {
      const createdJob = {
        id: 1,
        name: 'New Show',
        flexPullsheetId: 'abc-123-uuid',
        description: null,
        createdAt: new Date(),
      }
      mockPrisma.job.create.mockResolvedValue(createdJob)

      const res = makeRes()
      await createJob(makeReq({ name: 'New Show', flexPullsheetId: 'abc-123-uuid' }), res)

      expect(res._status).toBe(201)
      expect(res._json).toEqual(createdJob)
      expect(mockPrisma.job.create).toHaveBeenCalledWith({
        data: {
          name: 'New Show',
          flexPullsheetId: 'abc-123-uuid',
        },
      })
    })

    it('creates a job with optional description', async () => {
      const createdJob = {
        id: 1,
        name: 'New Show',
        flexPullsheetId: 'abc-123-uuid',
        description: 'Summer tour 2026',
        createdAt: new Date(),
      }
      mockPrisma.job.create.mockResolvedValue(createdJob)

      const res = makeRes()
      await createJob(
        makeReq({
          name: 'New Show',
          flexPullsheetId: 'abc-123-uuid',
          description: 'Summer tour 2026',
        }),
        res,
      )

      expect(res._status).toBe(201)
      expect(res._json).toEqual(createdJob)
      expect(mockPrisma.job.create).toHaveBeenCalledWith({
        data: {
          name: 'New Show',
          flexPullsheetId: 'abc-123-uuid',
          description: 'Summer tour 2026',
        },
      })
    })

    it('returns 400 when name is missing', async () => {
      const res = makeRes()
      await createJob(makeReq({ flexPullsheetId: 'abc-123-uuid' }), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({ error: 'Name and flexPullsheetId are required' })
      expect(mockPrisma.job.create).not.toHaveBeenCalled()
    })

    it('returns 400 when flexPullsheetId is missing', async () => {
      const res = makeRes()
      await createJob(makeReq({ name: 'New Show' }), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({ error: 'Name and flexPullsheetId are required' })
      expect(mockPrisma.job.create).not.toHaveBeenCalled()
    })

    it('returns 400 when both name and flexPullsheetId are missing', async () => {
      const res = makeRes()
      await createJob(makeReq({}), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({ error: 'Name and flexPullsheetId are required' })
    })

    it('returns 400 when name is whitespace-only', async () => {
      const res = makeRes()
      await createJob(makeReq({ name: '   ', flexPullsheetId: 'valid-id' }), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({ error: 'Name and flexPullsheetId are required' })
      expect(mockPrisma.job.create).not.toHaveBeenCalled()
    })

    it('returns 400 when flexPullsheetId is whitespace-only', async () => {
      const res = makeRes()
      await createJob(makeReq({ name: 'Valid', flexPullsheetId: '   ' }), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({ error: 'Name and flexPullsheetId are required' })
      expect(mockPrisma.job.create).not.toHaveBeenCalled()
    })

    it('returns 400 when both name and flexPullsheetId are whitespace-only', async () => {
      const res = makeRes()
      await createJob(makeReq({ name: '   ', flexPullsheetId: '   ' }), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({ error: 'Name and flexPullsheetId are required' })
      expect(mockPrisma.job.create).not.toHaveBeenCalled()
    })

    it('returns 500 on database error', async () => {
      mockPrisma.job.create.mockRejectedValue(new Error('Database error'))

      const res = makeRes()
      await createJob(makeReq({ name: 'New Show', flexPullsheetId: 'abc-123-uuid' }), res)

      expect(res._status).toBe(500)
      expect(res._json).toEqual({ error: 'Failed to create job' })
    })
  })

  describe('editJob', () => {
    it('updates job name', async () => {
      const updatedJob = {
        id: 1,
        name: 'Updated Show',
        flexPullsheetId: 'abc-123-uuid',
        description: null,
        createdAt: new Date(),
      }
      mockPrisma.job.update.mockResolvedValue(updatedJob)

      const res = makeRes()
      await editJob(makeReq({ name: 'Updated Show' }, { id: '1' }), res)

      expect(res._status).toBe(200)
      expect(res._json).toEqual(updatedJob)
      expect(mockPrisma.job.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Show' },
      })
    })

    it('updates job description', async () => {
      const updatedJob = {
        id: 1,
        name: 'Show',
        flexPullsheetId: 'abc-123-uuid',
        description: 'Updated description',
        createdAt: new Date(),
      }
      mockPrisma.job.update.mockResolvedValue(updatedJob)

      const res = makeRes()
      await editJob(makeReq({ description: 'Updated description' }, { id: '1' }), res)

      expect(res._status).toBe(200)
      expect(res._json).toEqual(updatedJob)
      expect(mockPrisma.job.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { description: 'Updated description' },
      })
    })

    it('updates both name and description', async () => {
      const updatedJob = {
        id: 1,
        name: 'Updated Show',
        flexPullsheetId: 'abc-123-uuid',
        description: 'Updated description',
        createdAt: new Date(),
      }
      mockPrisma.job.update.mockResolvedValue(updatedJob)

      const res = makeRes()
      await editJob(
        makeReq(
          { name: 'Updated Show', description: 'Updated description' },
          { id: '1' },
        ),
        res,
      )

      expect(res._status).toBe(200)
      expect(res._json).toEqual(updatedJob)
      expect(mockPrisma.job.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Updated Show',
          description: 'Updated description',
        },
      })
    })

    it('returns 400 when id is missing', async () => {
      const res = makeRes()
      await editJob(makeReq({ name: 'Updated Show' }, {}), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({ error: 'Invalid job ID' })
      expect(mockPrisma.job.update).not.toHaveBeenCalled()
    })

    it('returns 400 when id is non-numeric', async () => {
      const res = makeRes()
      await editJob(makeReq({ name: 'Updated Show' }, { id: 'abc' }), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({ error: 'Invalid job ID' })
      expect(mockPrisma.job.update).not.toHaveBeenCalled()
    })

    it('returns 400 when no fields to update', async () => {
      const res = makeRes()
      await editJob(makeReq({}, { id: '1' }), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({
        error: 'At least one field (name or description) is required',
      })
      expect(mockPrisma.job.update).not.toHaveBeenCalled()
    })

    it('allows description to be explicitly set to null', async () => {
      const updatedJob = {
        id: 1,
        name: 'Show',
        flexPullsheetId: 'abc-123-uuid',
        description: null,
        createdAt: new Date(),
      }
      mockPrisma.job.update.mockResolvedValue(updatedJob)

      const res = makeRes()
      await editJob(makeReq({ description: null }, { id: '1' }), res)

      expect(res._status).toBe(200)
      expect(mockPrisma.job.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { description: null },
      })
    })

    it('returns 500 on database error', async () => {
      mockPrisma.job.update.mockRejectedValue(new Error('Database error'))

      const res = makeRes()
      await editJob(makeReq({ name: 'Updated Show' }, { id: '1' }), res)

      expect(res._status).toBe(500)
      expect(res._json).toEqual({ error: 'Failed to update job' })
    })
  })

  describe('deleteJob', () => {
    it('deletes a job', async () => {
      mockPrisma.job.delete.mockResolvedValue({ id: 1 })

      const res = makeRes()
      await deleteJob(makeReq({}, { id: '1' }), res)

      expect(res._status).toBe(204)
      expect(res._sent).toBe(true)
      expect(mockPrisma.job.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })

    it('returns 400 when id is missing', async () => {
      const res = makeRes()
      await deleteJob(makeReq({}, {}), res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({ error: 'Invalid job ID' })
      expect(mockPrisma.job.delete).not.toHaveBeenCalled()
    })

    it('returns 500 on database error', async () => {
      mockPrisma.job.delete.mockRejectedValue(new Error('Database error'))

      const res = makeRes()
      await deleteJob(makeReq({}, { id: '1' }), res)

      expect(res._status).toBe(500)
      expect(res._json).toEqual({ error: 'Failed to delete job' })
    })

    it('cascades delete to related racks and equipment via schema', async () => {
      // The schema handles cascading via onDelete: Cascade
      // This test just verifies we call prisma.job.delete correctly
      mockPrisma.job.delete.mockResolvedValue({ id: 1 })

      const res = makeRes()
      await deleteJob(makeReq({}, { id: '1' }), res)

      expect(mockPrisma.job.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
      // Cascading is handled by the database schema, not the controller
    })
  })
})
