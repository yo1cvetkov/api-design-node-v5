import server from './server.ts';
import env from '../env.ts';

server.listen(env.PORT, () => {
  console.log(`Server is running on: http://localhost:${env.PORT}`);
});
