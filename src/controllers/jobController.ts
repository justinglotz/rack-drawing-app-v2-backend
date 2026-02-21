import { type Request, type Response} from 'express';
import { prisma } from '../config/prisma.js';

// Get all jobs
export const getJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
}

// Create job
export const createJob = async (req: Request, res: Response) => {
  try {
    const { name, flexPullsheetId, description } = req.body;

    if (!name || !flexPullsheetId) {
      res.status(400).json({ error: 'Name and flexPullsheetId are required' });
      return;
    }

    const newJob = await prisma.job.create({
      data: {
        name,
        flexPullsheetId,
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

    if (!id) {
      res.status(400).json({ error: 'Job ID is required' });
      return;
    }

    if (!name && description === undefined) {
      res.status(400).json({ error: 'At least one field (name or description) is required' });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id: parseInt(id as string) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
}

// Delete job
export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Job ID is required' });
      return;
    }

    await prisma.job.delete({
      where: { id: parseInt(id as string) },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
}
