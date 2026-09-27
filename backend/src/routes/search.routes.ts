import { Router, Request, Response } from 'express';
import { searchEmailsInEs } from '../services/elasticsearch.service';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const status = (req.query.status as string) || undefined;

    const results = await searchEmailsInEs(query, status);

    res.json({
      count: results.length,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
