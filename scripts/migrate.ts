import { getPool } from "../src/lib/db/pool";
import { applyMigrations, rollbackLast } from "../src/lib/db/migrate";

async function main() {
  const cmd = process.argv[2] ?? "up";
  const pool = getPool();
  try {
    if (cmd === "rollback") {
      const v = await rollbackLast(pool);
      console.log(v ? `Rolled back ${v}` : "Nothing to roll back");
    } else {
      const applied = await applyMigrations(pool);
      console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Already up to date");
    }
  } finally {
    await (pool as unknown as { end?: () => Promise<void> }).end?.();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
