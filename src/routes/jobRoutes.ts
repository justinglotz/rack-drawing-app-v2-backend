import { Router } from 'express';
import { getJobs, getJob, createJob, editJob, deleteJob } from '../controllers/jobController.js';

const router = Router();

router.get('/jobs', getJobs);
router.post('/jobs', createJob);
router.get('/jobs/:id', getJob);
router.patch('/jobs/:id', editJob);
router.delete('/jobs/:id', deleteJob);

export default router;
