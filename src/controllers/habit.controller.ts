import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import { db } from '../db/connection.ts';
import { habits, entries, habitTags } from '../db/schema.ts';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { JwtPayload } from '../utils/jwt.ts';

export const createHabit = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { name, description, frequency, targetCount, tagIds } = request.body;

    const result = await db.transaction(async (transaction) => {
      const [newHabit] = await transaction
        .insert(habits)
        .values({
          userId: (request.user as JwtPayload).id,
          name,
          description,
          frequency,
          targetCount,
        })
        .returning();

      if (tagIds && tagIds.length > 0) {
        const habitTagValues = tagIds.map((tagId: string) => ({
          habitId: newHabit.id,
          tagId,
        }));

        await transaction.insert(habitTags).values(habitTagValues);
      }

      return newHabit;
    });

    response.status(201).json({ message: 'Habit created', habit: result });
  } catch (error) {
    console.error('Create habit error', error);
    response.status(500).json({ message: 'Failed to create habit' });
  }
};

export const getUserHabits = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const userHabitsWithTags = await db.query.habits.findMany({
      where: eq(habits.userId, request.user!.id),
      with: {
        habitTags: {
          with: {
            tag: true,
          },
        },
      },
      orderBy: [desc(habits.createdAt)],
    });

    // equivalent to:

    //   const allHabits = await db.select()
    // .from(habits)
    // .leftJoin(habitTags, eq(habits.id, habitTags.habitId))
    // .leftJoin(tags, eq(habitTags.tagId, tags.id))
    // .where(eq(habits.userId, userId));

    const habitsWithTags = userHabitsWithTags.map((habit) => ({
      ...habit,
      tags: habit.habitTags.map((habitTag) => habitTag.tag),
      habitTags: undefined,
    }));

    response.json({
      habits: habitsWithTags,
    });
  } catch (error) {
    console.error('Get Uset Habits', error);
    response.status(500).json({ error: 'Failed to get user habits.' });
  }
};

export const updateHabit = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const id = request.params.id;

    const { tagIds, ...updates } = request.body;

    const result = await db.transaction(async (transaction) => {
      const [updatedHabit] = await transaction
        .update(habits)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(habits.id, id), eq(habits.userId, request.user!.id)))
        .returning();

      if (!updatedHabit) {
        return response.status(401).end();
      }

      if (!!tagIds) {
        await transaction.delete(habitTags).where(eq(habitTags.habitId, id));

        if (tagIds.length > 0) {
          const habitTagValues = tagIds.map((tagId: string) => ({
            habitId: id,
            tagId,
          }));

          await transaction.insert(habitTags).values(habitTagValues);
        }
      }

      return updateHabit;
    });

    return response.json({
      message: 'Habit was updated',
      updatedHabit: result,
    });
  } catch (error) {
    console.error('Update habit errored', error);
    return response.status(500).json({ error: 'Failed to update habit' });
  }
};

export const getHabitById = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { id } = request.params;
    const userId = request.user!.id;

    const habit = await db.query.habits.findFirst({
      where: and(eq(habits.id, id), eq(habits.userId, userId)),
      with: {
        habitTags: {
          with: {
            tag: true,
          },
        },
        entries: {
          orderBy: [desc(entries.completionDate)],
          limit: 10,
        },
      },
    });

    if (!habit) {
      return response.status(400).json({ error: 'Habit not found' });
    }

    const habitWithTags = {
      ...habit,
      tags: habit.habitTags.map((habitTag) => habitTag.tag),
      habitTags: undefined,
    };

    return response.json({
      habit: habitWithTags,
    });
  } catch (error) {
    console.error('Get habit error: ', error);
    return response.status(500).json({ error: 'Failed to fetch habit' });
  }
};

export const deleteHabit = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { id } = request.params;
    const userId = request.user!.id;

    const [deletedHabit] = await db
      .delete(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .returning();

    if (!deletedHabit) {
      return response.status(404).json({ message: 'Habit not found' });
    }

    return response
      .status(200)
      .json({ message: 'Habit deleted successfully.' });
  } catch (error) {
    console.error('Error deleting habit: ', error);
    return response.status(500).json({ error: 'Failed to delete habit' });
  }
};

export const completeHabit = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { id } = request.params;
    const userId = request.user!.id;
    const { note } = request.body;

    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)));

    if (!habit) {
      return response.status(404).json({ error: 'Habit not found' });
    }

    if (!habit.isActive) {
      return response
        .status(400)
        .json({ error: 'Cannot complete an inactive habit' });
    }

    const [newEntry] = await db
      .insert(entries)
      .values({
        habitId: id,
        completionDate: new Date(),
        note,
      })
      .returning();

    return response.status(201).json({
      message: 'Habit completed successfully',
      entry: newEntry,
    });
  } catch (error) {
    console.error('Failed to complete habit: ', error);
    return response.status(500).json({ error: 'Failed to complete habit' });
  }
};

export const addTagsToHabit = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { id } = request.params;
    const userId = request.user!.id;
    const { tagIds } = request.body;

    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)));

    if (!habit) {
      return response.status(404).json({ error: 'Habit not found' });
    }

    const existingTags = await db
      .select()
      .from(habitTags)
      .where(eq(habitTags.habitId, id));

    const existingTagIds = existingTags.map((ht) => ht.tagId);

    const newTagIds = tagIds.filter(
      (tagId: string) => !existingTagIds.includes(tagId),
    );

    if (newTagIds.length > 0) {
      const habitTagValues = newTagIds.map((tagId: string) => ({
        habitId: id,
        tagId,
      }));

      await db.insert(habitTags).values(habitTagValues);
    }

    return response.status(201).json({ message: 'Tag added successfully' });
  } catch (error) {
    console.error('Error adding tags', error);
    return response.status(500).json({ error: 'Failed to add tags to habit' });
  }
};

export const getHabitsByTag = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { tagId } = request.params;
    const userId = request.user!.id;

    const habitsWithTag = await db.query.habitTags.findMany({
      where: eq(habitTags.tagId, tagId),
      with: {
        habit: {
          with: {
            habitTags: {
              with: {
                tag: true,
              },
            },
          },
        },
      },
    });

    const userHabits = habitsWithTag
      .filter((ht) => ht.habit.userId === userId)
      .map((ht) => ({
        ...ht.habit,
        tags: ht.habit.habitTags.map((habitTag) => habitTag.tag),
        habitTags: undefined,
      }));

    return response.status(200).json({ habits: userHabits });
  } catch (error) {
    console.log('Error retrieving habits by tag', error);
    return response
      .status(500)
      .json({ error: 'Failed to fetch habits by tag' });
  }
};

export const removeTagFromHabit = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { id, tagId } = request.params;
    const userId = request.user!.id;

    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)));

    if (!habit) {
      return response.status(404).json({ error: 'Habit not found' });
    }

    await db
      .delete(habitTags)
      .where(and(eq(habitTags.habitId, id), eq(habitTags.tagId, tagId)));

    response.json({
      message: 'Tag removed successfully',
    });
  } catch (error) {
    console.error('Remove tag from habit error:', error);
    response.status(500).json({ error: 'Failed to remove tag from habit' });
  }
};
