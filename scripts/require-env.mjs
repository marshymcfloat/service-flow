import fs from "node:fs";
import path from "node:path";

const requiredKeys = process.argv.slice(2);

if (requiredKeys.length === 0) {
  console.error("Usage: node scripts/require-env.mjs <ENV_KEY> [ENV_KEY...]");
  process.exit(1);
}

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (!key || process.env[key]) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnvFile(path.resolve(process.cwd(), ".env"));
loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));

const missing = requiredKeys.filter((key) => {
  const value = process.env[key];
  return typeof value !== "string" || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missing.join(", ")}`,
  );
  process.exit(1);
}

const directDbKeys = ["DIRECT_DATABASE_URL", "E2E_DATABASE_URL"];
for (const key of requiredKeys) {
  if (!directDbKeys.includes(key)) continue;
  const value = String(process.env[key] || "").trim();
  const normalized =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
      ? value.slice(1, -1)
      : value;

  if (normalized.startsWith("prisma+postgres://")) {
    console.error(
      `${key} must be a direct postgres connection string (postgresql://...), not prisma+postgres://`,
    );
    process.exit(1);
  }
}

console.log(`Environment check passed: ${requiredKeys.join(", ")}`);
