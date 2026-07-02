import type { Request, Response } from 'express';
import { db } from '../db/connection.ts';
import { users, type NewUser } from '../db/schema.ts';
import { generateToken } from '../utils/jwt.ts';
import { comparePasswords, hashPassword } from '../utils/passwords.ts';
import { eq } from 'drizzle-orm';

export const register = async (
  request: Request<any, any, NewUser>,
  response: Response,
) => {
  try {
    const hashedPassword = await hashPassword(request.body.password);

    const [user] = await db
      .insert(users)
      .values({
        ...request.body,
        password: hashedPassword,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
      });

    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    return response.status(201).json({
      message: 'User created',
      user,
      token,
    });
  } catch (error) {
    console.error('Registration error', error);
    response.status(500).json({ error: 'Failed to create user' });
  }
};

export const login = async (request: Request, response: Response) => {
  try {
    const { email, password } = request.body;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return response.status(401).json({ error: 'Invalid credentials' });
    }

    const isCorrectPassword = await comparePasswords(password, user.password);

    if (!isCorrectPassword) {
      return response.status(401).json({ error: 'Invalid credentials' });
    }

    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    return response.status(201).json({
      message: 'Login success',
      user: {
        id: user.id,
        email: user.email,
        usename: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Logging error', error);
    return response.status(500).json({ error: 'Failed to login' });
  }
};
