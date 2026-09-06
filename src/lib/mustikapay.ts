import crypto from 'node:crypto';

/**
 * Interface untuk parameter pembuatan QRIS MustikaPay
 */
export interface CreateQrisParams {
  amount: number;
  product_name: string;
  customer_name: string;
  expiry?: number; // default 30 menit
}

/**
 * Interface response create QRIS dari MustikaPay
 */
export interface MustikaPayCreateResponse {
  status?: string | boolean;
  message?: string;
  qr_url?: string;
  payment_link?: string;
  ref_no?: string;
  reference?: string;
  data?: {
    qr_url?: string;
    payment_link?: string;
    ref_no?: string;
    reference?: string;
    amount?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Interface response check status dari MustikaPay
 */
export interface MustikaPayCheckResponse {
  status?: string | boolean;
  message?: string;
  receipt_url?: string;
  ref_no?: string;
  data?: {
    status?: string;
    ref_no?: string;
    reference?: string;
    receipt_url?: string;
    amount?: number;
    issuer?: string;
    payor?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Interface payload webhook dari MustikaPay
 */
export interface MustikaPayWebhookPayload {
  status?: string;
  service?: string;
  amount?: number;
  reference?: string;
  order_id?: string | null;
  timestamp?: string;
  data?: {
    amount?: number;
    net_amount?: number;
    issuer?: string;
    payor?: string;
    ref_no?: string;
    status?: string;
    type?: string;
    receipt_url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Record transaksi lokal dalam memori
 */
export interface TransactionRecord {
  ref_no: string;
  amount: number;
  product_name: string;
  customer_name: string;
  status: 'pending' | 'success' | 'expired' | 'failed' | string;
  qr_url?: string;
  payment_link?: string;
  receipt_url?: string;
  issuer?: string;
  payor?: string;
  net_amount?: number;
  createdAt: string;
  updatedAt: string;
  rawCreateResponse?: any;
  rawCheckResponse?: any;
  lastWebhookPayload?: any;
}

/**
 * Log webhook event
 */
export interface WebhookLogItem {
  id: string;
  timestamp: string;
  signatureReceived: string;
  signatureValid: boolean;
  rawBody: string;
  parsedBody: any;
  refNo?: string;
  status?: string;
  ip?: string;
}

/**
 * Hitung HMAC-SHA256 dari raw body string atau buffer menggunakan API key
 */
export function generateMustikaPaySignature(rawBody: string | Buffer, apiKey: string): string {
  return crypto
    .createHmac('sha256', apiKey.trim())
    .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
    .digest('hex');
}

/**
 * Verifikasi signature webhook X-Signature
 * Menggunakan timingSafeEqual untuk mencegah timing attacks
 */
export function verifyMustikaPaySignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  apiKey: string
): boolean {
  if (!signatureHeader || !apiKey) {
    return false;
  }

  try {
    const cleanHeader = signatureHeader.trim();
    const expectedSignature = generateMustikaPaySignature(rawBody, apiKey);

    const headerBuf = Buffer.from(cleanHeader, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');

    if (headerBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(headerBuf, expectedBuf);
  } catch (err) {
    console.error('[MustikaPay] Error verifying signature:', err);
    return false;
  }
}

/**
 * Normalisasi status transaksi ke format baku: 'pending' | 'success' | 'expired' | 'failed'
 */
export function normalizeStatus(rawStatus: any): string {
  if (!rawStatus) return 'pending';
  const str = String(rawStatus).toLowerCase().trim();
  if (str === 'success' || str === 'paid' || str === 'settlement') return 'success';
  if (str === 'expired' || str === 'cancel' || str === 'cancelled') return 'expired';
  if (str === 'failed' || str === 'failure') return 'failed';
  return str;
}
