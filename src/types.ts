export type PaymentMethod = 'qris' | 'ewallet' | 'va' | 'retail';

export interface TransactionRecord {
  ref_no: string;
  method?: PaymentMethod | string;
  channel?: string; // DANA, OVO, GOPAY, SHOPEEPAY, BCA, BRI, BNI, MANDIRI, ALFAMART, INDOMARET
  amount: number;
  product_name: string;
  customer_name: string;
  customer_phone?: string;
  status: 'pending' | 'success' | 'expired' | 'failed' | string;
  qr_url?: string;
  payment_link?: string;
  va_number?: string;
  retail_code?: string;
  checkout_url?: string;
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

export interface DatabaseStats {
  engine: string;
  filePath: string;
  totalTransactions: number;
  totalWebhookLogs: number;
  byStatus: { success: number; pending: number; failed: number; expired: number };
  byMethod: { qris: number; ewallet: number; va: number; retail: number };
}

export interface ConfigStatus {
  configured: boolean;
  keyMasked: string | null;
  hasRuntimeOverride: boolean;
  serverTime: string;
  baseUrl: string;
  sdk?: {
    name: string;
    version: string;
    isOfficial: boolean;
  };
  database?: DatabaseStats;
}

