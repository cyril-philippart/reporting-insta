import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { InstagramMetric, MonthlyMetric } from "@/lib/reporting/types";

export type HistoryRow = MonthlyMetric & { metric: InstagramMetric };
let database: DatabaseSync | null = null;

function getDatabase() {
  if (database) return database;
  const directory = join(process.cwd(), "data");
  mkdirSync(directory, { recursive: true });
  database = new DatabaseSync(join(directory, "cynes-reporting.sqlite"));
  database.exec(`CREATE TABLE IF NOT EXISTS monthly_metric_history (
    account_id TEXT NOT NULL, metric TEXT NOT NULL, month TEXT NOT NULL, value INTEGER,
    status TEXT NOT NULL, covered_days INTEGER NOT NULL, total_days INTEGER NOT NULL,
    updated_at TEXT NOT NULL, PRIMARY KEY (account_id, metric, month)
  )`);
  return database;
}

export function saveMonthlyHistory(accountId: string, rows: HistoryRow[]) {
  const statement = getDatabase().prepare(`INSERT INTO monthly_metric_history
    (account_id, metric, month, value, status, covered_days, total_days, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, metric, month) DO UPDATE SET value=excluded.value, status=excluded.status,
    covered_days=excluded.covered_days, total_days=excluded.total_days, updated_at=excluded.updated_at`);
  const updatedAt = new Date().toISOString();
  rows.forEach((row) => statement.run(accountId, row.metric, row.month, row.value, row.status, row.coveredDays, row.totalDays, updatedAt));
}

export function readMonthlyHistory(accountId: string): HistoryRow[] {
  return getDatabase().prepare(`SELECT metric, month, value, status,
    covered_days AS coveredDays, total_days AS totalDays FROM monthly_metric_history
    WHERE account_id = ? ORDER BY month ASC`).all(accountId) as HistoryRow[];
}
