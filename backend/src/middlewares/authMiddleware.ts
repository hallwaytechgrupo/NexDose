import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  const parts = authHeader.split(' ');
  const [scheme, token] = parts;

  if (parts.length !== 2 || !/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token malformatado' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    // Should be enforced at boot, but keep this defensive.
    return res.status(500).json({ error: 'JWT_SECRET nao configurado no servidor' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    (req as any).userId = (decoded as any).userId;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Token invalido' });
  }
};

