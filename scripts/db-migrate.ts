/**
 * Applies src/lib/db/schema.sql to the Neon database.
 *
 *   npm run db:migrate
 *
 * The schema is idempotent (`create table if not exists`), so re-running it is
 * safe and is the intended way to bring a fresh Neon project up to date.
 */

import { readFileSync } from "fs";
import path from "path";

import { neon } from "@neondatabase/serverless";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(path.join(process.cwd(), file));
    } catch {
      /* file absent — fall through to the ambient environment */
    }
  }
}

async function main() {
  loadEnv();

  const url = process.env.NEON_POSTGRES ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("NEON_POSTGRES is not set (checked .env.local, .env, environment).");
    process.exit(1);
  }

  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  const sql = neon(url);

  // The HTTP driver runs one statement per request, so split on `;` at the end
  // of a statement. The schema deliberately contains no functions or `$$` bodies.
  const statements = schema
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.split("\n").every((l) => l.trim().startsWith("--")));

  for (const statement of statements) {
    const label = statement.replace(/\s+/g, " ").slice(0, 72);
    await sql.query(statement);
    console.log(`  ok  ${label}…`);
  }

  const tables = (await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name
  `) as Array<{ table_name: string }>;

  console.log(`\nSchema applied. Tables: ${tables.map((t) => t.table_name).join(", ")}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
