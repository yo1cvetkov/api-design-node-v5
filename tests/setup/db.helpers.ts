import { db } from '../../src/db/connection.ts';
import {
  habits,
  users,
  entries,
  tags,
  type NewUser,
  type NewHabit,
  habitTags,
} from '../../src/db/schema.ts';
import { hashPassword } from '../../src/utils/passwords.ts';
import { generateToken } from '../../src/utils/jwt.ts';

export const createTestUser = async (userData: Partial<NewUser> = {}) => {
  const defaultData = {
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    username: `testUser-${Date.now()}-${Math.random()}`,
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'User',
    ...userData,
  };

  const hashedPassword = await hashPassword(defaultData.password);

  const [user] = await db
    .insert(users)
    .values({
      ...defaultData,
      password: hashedPassword,
    })
    .returning();

  const token = await generateToken({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  return { token, user, rawPassword: defaultData.password };
};

export const createTestHabit = async (
  userId: string,
  habitData: Partial<NewHabit> = {},
) => {
  const defaultData = {
    name: `Test habit ${Date.now()}`,
    description: 'A test habit',
    frequency: 'daily',
    targetCount: 1,
    ...habitData,
  };

  const [habit] = await db
    .insert(habits)
    .values({
      userId,
      ...defaultData,
    })
    .returning();

  return habit;
};

export const cleanupDatabases = async () => {
  await db.delete(entries);
  await db.delete(users);
  await db.delete(habitTags);
  await db.delete(habits);
  await db.delete(tags);
};
