import { Router } from 'express';
import {
  validateBody,
  validateParams,
} from '../middleware/validation.middleware.ts';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import {
  addTagsToHabit,
  completeHabit,
  createHabit,
  deleteHabit,
  getHabitById,
  getHabitsByTag,
  getUserHabits,
  removeTagFromHabit,
  updateHabit,
} from '../controllers/habit.controller.ts';
import { insertHabitSchema } from '../db/schema.ts';

const createHabitSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  frequency: z.string(),
  targetCount: z.string(),
  tagIds: z.array(z.string()).optional(),
});

const updateHabitSchema = insertHabitSchema
  .partial()
  .extend({ tagIds: z.array(z.string()).optional() });

const uuidSchema = z.object({
  id: z.uuid('Invalid habit ID format'),
});

const completeHabitSchema = z.object({
  note: z.string().optional(),
});

const addTagsSchema = z.object({
  tagIds: z.array(z.uuid()).min(1, 'At least one tag ID is required'),
});

const tagIdSchema = z.object({
  tagId: z.uuid(),
});

const habitTagSchema = z.object({
  id: z.uuid(),
  tagId: z.uuid(),
});

const router = Router();

router.use(authenticateToken);

router.get('/', getUserHabits);

router.get('/:id', validateParams(uuidSchema), getHabitById);

router.patch('/:id', validateBody(updateHabitSchema), updateHabit);

router.post('/', validateBody(createHabitSchema), createHabit);

router.delete('/:id', validateParams(uuidSchema), deleteHabit);

router.post(
  '/:id/complete',
  validateParams(uuidSchema),
  validateBody(completeHabitSchema),
  completeHabit,
);

router.post(
  '/:id/tags',
  validateParams(uuidSchema),
  validateBody(addTagsSchema),
  addTagsToHabit,
);

router.get('/tag/:tagId', validateParams(tagIdSchema), getHabitsByTag);

router.delete(
  '/:id/tags/:tagId',
  validateParams(habitTagSchema),
  removeTagFromHabit,
);

export default router;
