import bcrypt from 'bcrypt';
import env from '../../env.ts';

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
};

export const comparePasswords = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
