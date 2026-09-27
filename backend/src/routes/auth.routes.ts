import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, name, avatar, googleId } = req.body;

    const userEmail = email || 'oliver.brown@domain.io';
    const userName = name || 'Oliver Brown';
    const userAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    let user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: userName,
          avatar: userAvatar,
          googleId: googleId || null,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { email: userEmail },
        data: {
          name: userName,
          avatar: userAvatar,
          googleId: googleId || user.googleId,
        },
      });
    }

    res.json({
      user,
      token: `token_${user.id}_${Date.now()}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst() || {
      id: 'default_user_1',
      name: 'Oliver Brown',
      email: 'oliver.brown@domain.io',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
