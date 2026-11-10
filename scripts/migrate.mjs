// Derleme sırasında veritabanı migration'larını uygular (Vercel build).
//
// Bağlantı adresi ortam değişkeninden okunur; Vercel'in Supabase entegrasyonu
// POSTGRES_URL_NON_POOLING değişkenini kendisi tanımlar. Değişken yoksa adım atlanır,
// böylece veritabanı olmadan da derleme yapılabilir.
//
// Uygulanan dosyalar app_migrations.applied tablosunda izlenir; her dosya bir kez,
// tek bir transaction içinde çalışır. supabase/seed.sql tekrar çalıştırılabilir
// olduğu için her derlemede uygulanır.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(rootDir, "supabase", "migrations");
const seedFile = path.join(rootDir, "supabase", "seed.sql");

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  console.log("[migrate] No database URL found; skipping migrations.");
  process.exit(0);
}

function buildClientConfig(rawUrl) {
  const url = new URL(rawUrl);
  const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
  // sslmode parametresi pg'nin kendi ssl ayarını ezdiği için adresten çıkarılır.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("supa");
  url.searchParams.delete("pgbouncer");
  return {
    connectionString: url.toString(),
    // Supabase sunucu sertifikası kendi kök sertifikasıyla imzalıdır; bağlantı
    // şifrelidir ancak sertifika zinciri burada doğrulanmaz.
    ssl: isLocal ? false : { rejectUnauthorized: false },
  };
}

const client = new pg.Client(buildClientConfig(connectionString));

async function inTransaction(run) {
  await client.query("begin");
  try {
    const result = await run();
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  await client.connect();

  await client.query("create schema if not exists app_migrations");
  await client.query(`
    create table if not exists app_migrations.applied (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const applied = await inTransaction(async () => {
      // Aynı anda iki derleme çalışırsa ikincisi burada bekler.
      await client.query("lock table app_migrations.applied in exclusive mode");
      const existing = await client.query(
        "select 1 from app_migrations.applied where name = $1",
        [file],
      );
      if (existing.rowCount) return false;

      await client.query(await readFile(path.join(migrationsDir, file), "utf8"));
      await client.query("insert into app_migrations.applied (name) values ($1)", [file]);
      return true;
    });
    console.log(`[migrate] ${applied ? "applied" : "skipped"} ${file}`);
  }

  await inTransaction(async () => {
    await client.query(await readFile(seedFile, "utf8"));
  });
  console.log("[migrate] seed applied");

  // PostgREST şema önbelleğini yenile (Supabase dışında zararsızdır).
  await client.query("notify pgrst, 'reload schema'");
}

main()
  .catch((error) => {
    console.error("[migrate] failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
