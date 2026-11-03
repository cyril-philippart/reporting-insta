import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export type InstagramAccount = {
  id: string;
  instagramUserId: string;
  username: string;
  clientEmail: string | null;
  active: boolean;
};
let database: DatabaseSync | null = null;
function db() {
  if (database) return database;
  const directory = join(process.cwd(), "data");
  mkdirSync(directory, { recursive: true });
  database = new DatabaseSync(join(directory, "cynes-reporting.sqlite"));
  database.exec(
    `CREATE TABLE IF NOT EXISTS instagram_accounts (id TEXT PRIMARY KEY, instagram_user_id TEXT UNIQUE NOT NULL, username TEXT NOT NULL, encrypted_token TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  );
  const columns = database
    .prepare("PRAGMA table_info(instagram_accounts)")
    .all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "client_email"))
    database.exec(
      "ALTER TABLE instagram_accounts ADD COLUMN client_email TEXT",
    );
  return database;
}
function key() {
  const secret = process.env.CYNES_ENCRYPTION_KEY;
  if (!secret || secret.length < 32)
    throw new Error(
      "CYNES_ENCRYPTION_KEY doit contenir au moins 32 caractères.",
    );
  return createHash("sha256").update(secret).digest();
}
function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
function decrypt(value: string) {
  const payload = Buffer.from(value, "base64");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    payload.subarray(0, 12),
  );
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([
    decipher.update(payload.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
export function listAccounts(): InstagramAccount[] {
  return db()
    .prepare(
      "SELECT id, instagram_user_id AS instagramUserId, username, client_email AS clientEmail, active FROM instagram_accounts ORDER BY username",
    )
    .all()
    .map((row) => ({
      ...(row as InstagramAccount),
      active: Boolean((row as { active: number }).active),
    }));
}
export function saveAccount(input: {
  instagramUserId: string;
  username: string;
  token: string;
  clientEmail: string;
}) {
  const id = input.instagramUserId;
  const now = new Date().toISOString();
  db()
    .prepare(
      `INSERT INTO instagram_accounts (id,instagram_user_id,username,encrypted_token,client_email,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?) ON CONFLICT(instagram_user_id) DO UPDATE SET username=excluded.username, encrypted_token=excluded.encrypted_token, client_email=excluded.client_email, active=1, updated_at=excluded.updated_at`,
    )
    .run(
      id,
      input.instagramUserId,
      input.username,
      encrypt(input.token),
      input.clientEmail,
      now,
      now,
    );
  return id;
}
export function updateAccountEmail(id: string, clientEmail: string) {
  db()
    .prepare(
      "UPDATE instagram_accounts SET client_email=?, updated_at=? WHERE id=?",
    )
    .run(clientEmail, new Date().toISOString(), id);
}
export function getAccountToken(id: string) {
  const row = db()
    .prepare(
      "SELECT encrypted_token FROM instagram_accounts WHERE id=? AND active=1",
    )
    .all(id)[0] as { encrypted_token: string } | undefined;
  return row ? decrypt(row.encrypted_token) : null;
}
export function deleteAccount(id: string) {
  db().prepare("DELETE FROM instagram_accounts WHERE id=?").run(id);
}
