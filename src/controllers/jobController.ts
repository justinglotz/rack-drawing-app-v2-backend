import { type Request, type Response} from 'express';
import { prisma } from '../config/prisma.js';

// Get all jobs
export const getJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany();
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
}

// Create job
export const createJob = async (req: Request, res: Response) => {
  try {
    const { name, flexPullsheetId, description } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const parsedFlexPullsheetId = Number(flexPullsheetId)

    if (!normalizedName || !Number.isInteger(parsedFlexPullsheetId)) {
      res.status(400).json({ error: 'Name and flexPullsheetId are required' });
      return;
    }

    const newJob = await prisma.job.create({
      data: {
        name: normalizedName,
        flexPullsheetId: parsedFlexPullsheetId,
        ...(description && { description }),
      },
    });

    res.status(201).json(newJob);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create job' });
  }
}

// Edit job
export const editJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const jobId = Number(id);

    if (!Number.isInteger(jobId)) {
      res.status(400).json({ error: 'Invalid job ID' });
      return;
    }

    if (!name && description === undefined) {
      res.status(400).json({ error: 'At least one field (name or description) is required' });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    res.status(200).json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
}

// Delete job
export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);
    if (!Number.isInteger(jobId)) {
      res.status(400).json({ error: 'Invalid job ID' });
      return;
    }

    await prisma.job.delete({
      where: { id: jobId },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
}
