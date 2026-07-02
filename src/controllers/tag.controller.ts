import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.ts';

import { db } from '../db/connection.ts';
import { tags, habitTags } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';

export const getTags = async (request: Request, response: Response) => {
  try {
    const allTags = await db.select().from(tags).orderBy(tags.name);

    return response.status(200).json({
      tags: allTags,
    });
  } catch (error) {
    console.error('Error getting tags', error);
    return response.status(500).json({ error: 'Failed to get tags' });
  }
};

export const getTagById = async (request: Request, response: Response) => {
  try {
    const { id } = request.params;

    const tag = await db.query.tags.findFirst({
      where: eq(tags.id, id),
      with: {
        habitTags: {
          with: {
            habit: {
              columns: {
                id: true,
                name: true,
                description: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!tag) {
      return response.status(404).json({ error: 'Tag not found' });
    }

    const tagWithHabits = {
      ...tag,
      habits: tag.habitTags.map((ht) => ht.habit),
      habitTags: undefined,
    };

    return response.json({
      tag: tagWithHabits,
    });
  } catch (error) {
    console.error('Error getting tag by ID', error);
    return response.status(500).json({ error: 'Failed to get tag' });
  }
};

export const getPopularTags = async (request: Request, response: Response) => {
  try {
    const tagsWithCount = await db.query.tags.findMany({
      with: {
        habitTags: true,
      },
    });

    const popularTags = tagsWithCount
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        usageCount: tag.habitTags.length,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    return response.json({ tags: popularTags });
  } catch (error) {
    console.error('Get popular tags error: ', error);
    return response.status(500).json({ error: 'Error getting popular tags' });
  }
};

export const createTag = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { name, color } = request.body;

    const existingTag = await db.query.tags.findFirst({
      where: eq(tags.name, name),
    });

    if (existingTag) {
      return response
        .status(409)
        .json({ error: 'Tag with this name already exists' });
    }

    const [newTag] = await db
      .insert(tags)
      .values({
        name,
        color: color || '#6b7280',
      })
      .returning();

    return response
      .status(201)
      .json({ message: 'Tag creted successfully', tag: newTag });
  } catch (error) {
    console.error('Error creating tag: ', error);
    return response.status(500).json({ error: 'Failed to create tag' });
  }
};

export const updateTag = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { id } = request.params;
    const { name, color } = request.body;

    if (name) {
      const existingTag = await db.query.tags.findFirst({
        where: eq(tags.name, name),
      });

      if (existingTag && existingTag.id !== id) {
        return response
          .status(409)
          .json({ error: 'Tag with this name already exists' });
      }
    }

    const updates: any = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (color) updates.color = color;

    const [updatedTag] = await db
      .update(tags)
      .set(updates)
      .where(eq(tags.id, id))
      .returning();

    if (!updatedTag) {
      return response.status(404).json({ error: 'Tag not found' });
    }

    response.json({
      message: 'Tag updated successfully',
      tag: updatedTag,
    });
  } catch (error) {
    console.error('Update tag error:', error);
    response.status(500).json({ error: 'Failed to update tag' });
  }
};

export const deleteTag = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { id } = request.params;

    const tagUsage = await db
      .select()
      .from(habitTags)
      .where(eq(habitTags.tagId, id))
      .limit(1);

    if (tagUsage.length > 0) {
      return response.status(409).json({
        error: 'Cannot delete tag that is currently in use',
        message: 'Remove this tag from all habits before deleting',
      });
    }

    const [deletedTag] = await db
      .delete(tags)
      .where(eq(tags.id, id))
      .returning();

    if (!deletedTag) {
      return response.status(404).json({ error: 'Tag not found' });
    }

    response.json({
      message: 'Tag deleted successfully',
    });
  } catch (error) {
    console.error('Delete tag error:', error);
    response.status(500).json({ error: 'Failed to delete tag' });
  }
};

export const getTagHabits = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const { id } = request.params;
    const userId = request.user!.id;

    const tagWithHabits = await db.query.tags.findFirst({
      where: eq(tags.id, id),
      with: {
        habitTags: {
          with: {
            habit: {
              with: {
                user: {
                  columns: {
                    id: true,
                    username: true,
                  },
                },
                habitTags: {
                  with: {
                    tag: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tagWithHabits) {
      return response.status(404).json({ error: 'Tag not found' });
    }

    const userHabits = tagWithHabits.habitTags
      .filter((ht) => ht.habit.userId === userId)
      .map((ht) => ({
        ...ht.habit,
        tags: ht.habit.habitTags.map((habitTag) => habitTag.tag),
        habitTags: undefined,
        user: undefined,
      }));

    response.json({
      tag: {
        id: tagWithHabits.id,
        name: tagWithHabits.name,
        color: tagWithHabits.color,
      },
      habits: userHabits,
    });
  } catch (error) {
    console.error('Get tag habits error:', error);
    response.status(500).json({ error: 'Failed to fetch habits for tag' });
  }
};
