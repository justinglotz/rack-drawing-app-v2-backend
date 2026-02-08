import { type Request, type Response} from 'express';
import { prisma } from '../config/prisma.js';

export const getJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
}
