import express from 'express';
import authRoutes from './routes/auth.routes.ts';
import habitRoutes from './routes/habit.routes.ts';
import userRoutes from './routes/habit.routes.ts';
import tagRoutes from './routes/tag.routes.ts';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { isTest } from '../env.ts';
import { errorHandler } from './middleware/error-handler.middleware.ts';

const server = express();

server.use(helmet());
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(
  morgan('dev', {
    skip: () => isTest(),
  }),
);

server.get('/health', (request, response) => {
  response.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Habit Tracker API',
  });
});

server.use('/api/auth', authRoutes);
server.use('/api/users', userRoutes);
server.use('/api/habits', habitRoutes);
server.use('/api/tags', tagRoutes);

server.use(errorHandler);

export { server };

export default server;
