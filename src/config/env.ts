import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),

  // PostgreSQL configuration
  DB_HOST: process.env.DB_HOST ?? "localhost",
  DB_PORT: Number(process.env.DB_PORT ?? 5432),
  DB_USER: process.env.DB_USER ?? "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD ?? "pawan",
  DB_NAME: process.env.DB_NAME ?? "local_db",
};

export const isProduction = env.NODE_ENV === "production";