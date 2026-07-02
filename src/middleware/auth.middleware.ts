import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../utils/jwt.ts';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = async (
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return response.status(400).json({ error: 'Bad Request' });
    }

    const payload = await verifyToken(token);

    request.user = payload;

    next();
  } catch (error) {
    return response.status(403).json({ error: 'Forbidden' });
  }
};
