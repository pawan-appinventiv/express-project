import { closeDB, connectDB, initSchema } from '../src/config/db';

const migrate = async (): Promise<void> => {
  await connectDB();
  await initSchema();
  console.log('Database schema is up to date');
  await closeDB();
};

migrate().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
