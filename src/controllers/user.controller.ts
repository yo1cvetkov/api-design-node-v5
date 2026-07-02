import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import db from '../db/connection.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { comparePasswords, hashPassword } from '../utils/passwords.ts';

export const getProfile = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const userId = request.user!.id;

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users?.firstName,
        lastName: users?.lastName,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return response.status(404).json({ error: 'User not found' });
    }

    return response.json({ user });
  } catch (error) {
    console.error('Error getting profile', error);
    return response.status(500).json({ error: 'Failed to get profile' });
  }
};

export const updateProfile = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const userId = request.user!.id;
    const { email, firstName, lastName, username } = request.body;

    const [updatedUser] = await db
      .update(users)
      .set({
        email,
        username,
        firstName,
        lastName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        updatedAt: users.updatedAt,
      });

    return response.status(201).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user profile', error);
    return response.status(500).json({ error: 'Failed to update profile' });
  }
};

export const changePassword = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  try {
    const userId = request.user!.id;
    const { currentPassword, newPassword } = request.body;

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return response.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await comparePasswords(
      currentPassword,
      user.password,
    );

    if (!isValidPassword) {
      return response
        .status(400)
        .json({ error: 'Current password is incorrect' });
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        password: hashedNewPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return response
      .status(200)
      .json({ message: 'Password changed successfully' });
  } catch (error) {}
};
