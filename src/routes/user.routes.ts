import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import {
  changePassword,
  getProfile,
  updateProfile,
} from '../controllers/user.controller.ts';
import { validateBody } from '../middleware/validation.middleware.ts';
import z from 'zod';

const router = Router();

router.use(authenticateToken);

const updateUserProfileSchema = z.object({
  email: z.email().optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .max(50)
    .optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long'),
});

router.get('/profile', getProfile);

router.put('/profile', validateBody(updateUserProfileSchema), updateProfile);

router.put('/password', validateBody(changePasswordSchema), changePassword);

export default router;
