import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { TransactionRecord, WebhookLogItem } from '../types.js';

// Pastikan direktori data ada
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DB_PATH = path.join(DATA_DIR, 'mustikapay.sqlite');

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  // Aktifkan WAL mode untuk performa & konkurensi optimal
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');

  // Tabel transaksi dengan dukungan Multi-Payment (QRIS, E-Wallet, VA, Retail)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      ref_no TEXT PRIMARY KEY,
      method TEXT NOT NULL DEFAULT 'qris',
      channel TEXT,
      amount REAL NOT NULL,
      net_amount REAL,
      product_name TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      qr_url TEXT,
      payment_link TEXT,
      va_number TEXT,
      retail_code TEXT,
      checkout_url TEXT,
      issuer TEXT,
      payor TEXT,
      receipt_url TEXT,
      raw_create_response TEXT,
      raw_check_response TEXT,
      last_webhook_payload TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tx_method ON transactions(method);
  `);

  // Tabel webhook logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      signature_received TEXT,
      signature_valid INTEGER NOT NULL DEFAULT 0,
      ref_no TEXT,
      status TEXT,
      ip TEXT,
      raw_body TEXT,
      parsed_body TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_wh_timestamp ON webhook_logs(timestamp DESC);
  `);
}

// Convert SQLite row to TransactionRecord
function rowToTx(row: any): TransactionRecord {
  return {
    ref_no: row.ref_no,
    method: row.method || 'qris',
    channel: row.channel || undefined,
    amount: Number(row.amount),
    net_amount: row.net_amount !== null ? Number(row.net_amount) : undefined,
    product_name: row.product_name || '',
    customer_name: row.customer_name || '',
    customer_phone: row.customer_phone || undefined,
    status: row.status,
    qr_url: row.qr_url || undefined,
    payment_link: row.payment_link || undefined,
    va_number: row.va_number || undefined,
    retail_code: row.retail_code || undefined,
    checkout_url: row.checkout_url || undefined,
    issuer: row.issuer || undefined,
    payor: row.payor || undefined,
    receipt_url: row.receipt_url || undefined,
    rawCreateResponse: row.raw_create_response ? safeJsonParse(row.raw_create_response) : undefined,
    rawCheckResponse: row.raw_check_response ? safeJsonParse(row.raw_check_response) : undefined,
    lastWebhookPayload: row.last_webhook_payload ? safeJsonParse(row.last_webhook_payload) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeJsonParse(val: string): any {
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

export function saveTransaction(tx: TransactionRecord): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO transactions (
      ref_no, method, channel, amount, net_amount,
      product_name, customer_name, customer_phone,
      status, qr_url, payment_link, va_number, retail_code, checkout_url,
      issuer, payor, receipt_url,
      raw_create_response, raw_check_response, last_webhook_payload,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?
    )
    ON CONFLICT(ref_no) DO UPDATE SET
      method = COALESCE(excluded.method, transactions.method),
      channel = COALESCE(excluded.channel, transactions.channel),
      amount = excluded.amount,
      net_amount = COALESCE(excluded.net_amount, transactions.net_amount),
      product_name = COALESCE(excluded.product_name, transactions.product_name),
      customer_name = COALESCE(excluded.customer_name, transactions.customer_name),
      customer_phone = COALESCE(excluded.customer_phone, transactions.customer_phone),
      status = excluded.status,
      qr_url = COALESCE(excluded.qr_url, transactions.qr_url),
      payment_link = COALESCE(excluded.payment_link, transactions.payment_link),
      va_number = COALESCE(excluded.va_number, transactions.va_number),
      retail_code = COALESCE(excluded.retail_code, transactions.retail_code),
      checkout_url = COALESCE(excluded.checkout_url, transactions.checkout_url),
      issuer = COALESCE(excluded.issuer, transactions.issuer),
      payor = COALESCE(excluded.payor, transactions.payor),
      receipt_url = COALESCE(excluded.receipt_url, transactions.receipt_url),
      raw_create_response = COALESCE(excluded.raw_create_response, transactions.raw_create_response),
      raw_check_response = COALESCE(excluded.raw_check_response, transactions.raw_check_response),
      last_webhook_payload = COALESCE(excluded.last_webhook_payload, transactions.last_webhook_payload),
      updated_at = excluded.updated_at
  `);

  stmt.run(
    tx.ref_no,
    tx.method || 'qris',
    tx.channel || null,
    tx.amount,
    tx.net_amount ?? null,
    tx.product_name || null,
    tx.customer_name || null,
    tx.customer_phone || null,
    tx.status,
    tx.qr_url || null,
    tx.payment_link || null,
    tx.va_number || null,
    tx.retail_code || null,
    tx.checkout_url || null,
    tx.issuer || null,
    tx.payor || null,
    tx.receipt_url || null,
    tx.rawCreateResponse ? JSON.stringify(tx.rawCreateResponse) : null,
    tx.rawCheckResponse ? JSON.stringify(tx.rawCheckResponse) : null,
    tx.lastWebhookPayload ? JSON.stringify(tx.lastWebhookPayload) : null,
    tx.createdAt || new Date().toISOString(),
    tx.updatedAt || new Date().toISOString()
  );
}

export function updateTransaction(ref_no: string, updates: Partial<TransactionRecord>): TransactionRecord | null {
  const existing = getTransaction(ref_no);
  if (!existing) return null;

  const merged: TransactionRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveTransaction(merged);
  return merged;
}

export function getTransaction(ref_no: string): TransactionRecord | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM transactions WHERE ref_no = ? LIMIT 1');
  const row = stmt.get(ref_no);
  if (!row) return null;
  return rowToTx(row);
}

export function getAllTransactions(limit = 100): TransactionRecord[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?');
  const rows = stmt.all(limit) as any[];
  return rows.map(rowToTx);
}

export function deleteTransaction(ref_no: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM transactions WHERE ref_no = ?');
  const result = stmt.run(ref_no);
  return (result.changes ?? 0) > 0;
}

export function clearAllTransactions(): void {
  const db = getDatabase();
  db.exec('DELETE FROM transactions;');
  db.exec('DELETE FROM webhook_logs;');
}

export function saveWebhookLog(log: WebhookLogItem): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO webhook_logs (
      id, timestamp, signature_received, signature_valid,
      ref_no, status, ip, raw_body, parsed_body
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    log.id,
    log.timestamp,
    log.signatureReceived,
    log.signatureValid ? 1 : 0,
    log.refNo || null,
    log.status || null,
    log.ip || null,
    log.rawBody || null,
    log.parsedBody ? JSON.stringify(log.parsedBody) : null
  );
}

export function getAllWebhookLogs(limit = 50): WebhookLogItem[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM webhook_logs ORDER BY timestamp DESC LIMIT ?');
  const rows = stmt.all(limit) as any[];

  return rows.map((r: any) => ({
    id: r.id,
    timestamp: r.timestamp,
    signatureReceived: r.signature_received,
    signatureValid: Boolean(r.signature_valid),
    rawBody: r.raw_body || '',
    parsedBody: r.parsed_body ? safeJsonParse(r.parsed_body) : {},
    refNo: r.ref_no || undefined,
    status: r.status || undefined,
    ip: r.ip || undefined,
  }));
}

export function getDatabaseStats(): {
  engine: string;
  filePath: string;
  totalTransactions: number;
  totalWebhookLogs: number;
  byStatus: { success: number; pending: number; failed: number; expired: number };
  byMethod: { qris: number; ewallet: number; va: number; retail: number };
} {
  const db = getDatabase();
  const totalTx = Number((db.prepare('SELECT COUNT(*) as count FROM transactions').get() as any)?.count || 0);
  const totalWh = Number((db.prepare('SELECT COUNT(*) as count FROM webhook_logs').get() as any)?.count || 0);

  const statusRows = db.prepare('SELECT status, COUNT(*) as count FROM transactions GROUP BY status').all() as any[];
  const byStatus = { success: 0, pending: 0, failed: 0, expired: 0 };
  for (const r of statusRows) {
    const key = (r.status || '').toLowerCase() as keyof typeof byStatus;
    if (key in byStatus) {
      byStatus[key] = Number(r.count);
    }
  }

  const methodRows = db.prepare('SELECT method, COUNT(*) as count FROM transactions GROUP BY method').all() as any[];
  const byMethod = { qris: 0, ewallet: 0, va: 0, retail: 0 };
  for (const r of methodRows) {
    const key = (r.method || '').toLowerCase() as keyof typeof byMethod;
    if (key in byMethod) {
      byMethod[key] = Number(r.count);
    }
  }

  return {
    engine: 'SQLite (Node.js DatabaseSync)',
    filePath: DB_PATH,
    totalTransactions: totalTx,
    totalWebhookLogs: totalWh,
    byStatus,
    byMethod,
  };
}
