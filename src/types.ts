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
}
