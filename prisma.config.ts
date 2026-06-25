import { defineConfig, env } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Must use the DIRECT connection (port 5432) for migrations.
    // The transaction pooler (port 6543 / pgbouncer) cannot run DDL statements.
    url: env("DIRECT_URL"),
  },
});
