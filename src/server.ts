import app from './app';
import { connectDB, initSchema } from './config/db';
import { env } from './config/env';

const start = async (): Promise<void> => {
  await connectDB();
  await initSchema();
  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
};

start().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});