import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import MustikaPay from 'mustikapay-node';
import {
  verifyMustikaPaySignature,
  generateMustikaPaySignature,
  normalizeStatus,
  TransactionRecord,
  WebhookLogItem,
  MustikaPayCreateResponse,
  MustikaPayCheckResponse,
  MustikaPayWebhookPayload,
} from './src/lib/mustikapay';

// Load environment variables (.env, .env.local)
dotenv.config();
dotenv.config({ path: '.env.local' });

const PORT = 3000;
const MUSTIKAPAY_BASE_URL = 'https://mustikapayment.com';

// In-memory store for testing transactions
const transactionsStore = new Map<string, TransactionRecord>();

// In-memory store for recent webhook event logs (up to 50 items)
const webhookLogs: WebhookLogItem[] = [];

// Optional runtime API key override for UI convenience during testing
let runtimeApiKeyOverride: string | null = null;

function getApiKey(): string {
  if (runtimeApiKeyOverride && runtimeApiKeyOverride.trim() !== '') {
    return runtimeApiKeyOverride.trim();
  }
  return (process.env.MUSTIKAPAY_API_KEY || '').trim();
}

/**
 * Mendapatkan instance MustikaPay resmi dari package 'mustikapay-node'
 */
function getMustikaPayClient(): MustikaPay | null {
  const key = getApiKey();
  if (!key) return null;
  return new MustikaPay({ apiKey: key, baseUrl: MUSTIKAPAY_BASE_URL });
}

async function startServer() {
  const app = express();

  // 1. Raw body parsing for webhook receiver - MUST capture pristine raw bytes before any JSON parsing
  app.post(
    '/api/webhook/mustikapay',
    express.raw({ type: '*/*', limit: '2mb' }),
    (req: Request, res: Response): void => {
      const apiKey = getApiKey();
      const rawBodyBuffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === 'string' ? req.body : '', 'utf8');
      const rawBodyText = rawBodyBuffer.toString('utf8');

      // Signature can come in 'x-signature' or 'X-Signature'
      const signatureHeader =
        (req.headers['x-signature'] as string) ||
        (req.headers['X-Signature'] as string) ||
        '';

      console.log('\n--- [MustikaPay Webhook Received] ---');
      console.log('Timestamp:', new Date().toISOString());
      console.log('X-Signature Header:', signatureHeader || '(none)');
      console.log('Raw Body Length:', rawBodyBuffer.length);
      console.log('Raw Body Preview:', rawBodyText.slice(0, 500));

      // Verifikasi signature HMAC-SHA256 menggunakan official SDK mustikapay-node
      let isSignatureValid = false;
      const mp = getMustikaPayClient();
      if (!apiKey || !mp) {
        console.warn('[MustikaPay Webhook] WARNING: MUSTIKAPAY_API_KEY is not configured on server!');
      } else {
        // Gunakan verifyCallback resmi dari mustikapay-node, fallback ke timingSafeEqual
        isSignatureValid =
          mp.verifyCallback(rawBodyText, signatureHeader) ||
          verifyMustikaPaySignature(rawBodyBuffer, signatureHeader, apiKey);
      }

      let parsedPayload: MustikaPayWebhookPayload = {};
      try {
        if (rawBodyText.trim()) {
          parsedPayload = JSON.parse(rawBodyText);
        }
      } catch (parseErr) {
        console.warn('[MustikaPay Webhook] Warning: Body is not valid JSON:', parseErr);
      }

      // Identify ref_no and status defensively
      const refNo =
        parsedPayload?.data?.ref_no ||
        parsedPayload?.reference ||
        parsedPayload?.data?.reference ||
        parsedPayload?.order_id ||
        undefined;

      const rawStatus = parsedPayload?.data?.status || parsedPayload?.status || 'UNKNOWN';
      const cleanStatus = normalizeStatus(rawStatus);

      // Log to in-memory log list for easy UI inspection
      const logEntry: WebhookLogItem = {
        id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        signatureReceived: signatureHeader,
        signatureValid: isSignatureValid,
        rawBody: rawBodyText,
        parsedBody: parsedPayload,
        refNo,
        status: cleanStatus,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      };
      webhookLogs.unshift(logEntry);
      if (webhookLogs.length > 50) {
        webhookLogs.pop();
      }

      // Reject if signature invalid
      if (!isSignatureValid) {
        console.error('[MustikaPay Webhook] Signature verification FAILED! Rejecting with 400.');
        res.status(400).json({
          error: 'Invalid signature',
          message: 'HMAC-SHA256 signature does not match using merchant API key',
        });
        return;
      }

      console.log('[MustikaPay Webhook] Signature verification SUCCESSFUL!');
      console.log('Parsed Webhook Payload:', JSON.stringify(parsedPayload, null, 2));

      // Update transaction in memory store if refNo is recognized
      if (refNo) {
        const existing = transactionsStore.get(refNo);
        const receiptUrl =
          parsedPayload?.data?.receipt_url ||
          (parsedPayload as any)?.receipt_url ||
          existing?.receipt_url;

        if (existing) {
          existing.status = cleanStatus;
          existing.updatedAt = new Date().toISOString();
          existing.lastWebhookPayload = parsedPayload;
          if (receiptUrl) existing.receipt_url = receiptUrl;
          if (parsedPayload?.data?.issuer) existing.issuer = parsedPayload.data.issuer;
          if (parsedPayload?.data?.payor) existing.payor = parsedPayload.data.payor;
          if (parsedPayload?.data?.net_amount) existing.net_amount = parsedPayload.data.net_amount;
          transactionsStore.set(refNo, existing);
          console.log(`[MustikaPay Webhook] Updated transaction ${refNo} status to: ${cleanStatus}`);
        } else {
          // If transaction wasn't in memory yet, create record from webhook
          const newRecord: TransactionRecord = {
            ref_no: refNo,
            amount: Number(parsedPayload?.data?.amount || parsedPayload?.amount || 0),
            product_name: 'Pembayaran QRIS',
            customer_name: parsedPayload?.data?.payor || 'Customer',
            status: cleanStatus,
            receipt_url: receiptUrl,
            issuer: parsedPayload?.data?.issuer,
            payor: parsedPayload?.data?.payor,
            net_amount: parsedPayload?.data?.net_amount,
            createdAt: parsedPayload?.timestamp || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastWebhookPayload: parsedPayload,
          };
          transactionsStore.set(refNo, newRecord);
          console.log(`[MustikaPay Webhook] Created new transaction ${refNo} from webhook callback`);
        }
      }

      // WAJIB: Selalu balas 200 OK kalau signature valid, agar MustikaPay tidak retry terus
      res.status(200).json({
        status: 'ok',
        message: 'Webhook processed successfully',
        ref_no: refNo,
        transaction_status: cleanStatus,
      });
    }
  );

  // 2. Standard JSON and URL-encoded parsers for subsequent API routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Config Status (Check if API key is present)
  app.get('/api/config-status', (req: Request, res: Response): void => {
    const currentKey = getApiKey();
    const isConfigured = currentKey.length > 0;
    const masked = isConfigured
      ? currentKey.length > 8
        ? `${currentKey.slice(0, 4)}...${currentKey.slice(-4)}`
        : '****'
      : null;

    res.json({
      configured: isConfigured,
      keyMasked: masked,
      hasRuntimeOverride: Boolean(runtimeApiKeyOverride),
      serverTime: new Date().toISOString(),
      baseUrl: MUSTIKAPAY_BASE_URL,
      sdk: {
        name: 'mustikapay-node',
        version: '1.4.1',
        isOfficial: true,
      },
    });
  });

  // Ambil daftar bank via official SDK (mp.getBankList())
  app.get('/api/mustikapay/bank-list', async (req: Request, res: Response): Promise<void> => {
    try {
      const mp = getMustikaPayClient();
      if (!mp) {
        res.status(500).json({ error: 'MUSTIKAPAY_API_KEY belum disetel' });
        return;
      }
      const data = await mp.getBankList();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal mengambil daftar bank' });
    }
  });

  // Set or update runtime API key for quick interactive testing
  app.post('/api/config-status', (req: Request, res: Response): void => {
    const { apiKey } = req.body;
    if (typeof apiKey === 'string') {
      runtimeApiKeyOverride = apiKey.trim() || null;
      res.json({
        success: true,
        configured: Boolean(getApiKey()),
        message: runtimeApiKeyOverride ? 'API key runtime berhasil disimpan' : 'API key runtime direset ke .env',
      });
      return;
    }
    res.status(400).json({ error: 'Field apiKey diperlukan' });
  });

  // 3. Create QRIS Route Handler
  // POST /api/mustikapay/create-qris
  app.post('/api/mustikapay/create-qris', async (req: Request, res: Response): Promise<void> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(500).json({
        error: 'MUSTIKAPAY_API_KEY belum disetel',
        message: 'Silakan atur MUSTIKAPAY_API_KEY di .env.local atau di panel konfigurasi atas.',
      });
      return;
    }

    const { amount, product_name, customer_name, expiry = 30 } = req.body;

    // Minimum nominal validation (Rp 1.000)
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 1000) {
      res.status(400).json({
        error: 'Nominal tidak valid',
        message: 'Nominal minimum untuk QRIS MustikaPay adalah Rp 1.000.',
      });
      return;
    }

    if (!product_name || !String(product_name).trim()) {
      res.status(400).json({
        error: 'Nama produk kosong',
        message: 'Nama produk wajib diisi.',
      });
      return;
    }

    if (!customer_name || !String(customer_name).trim()) {
      res.status(400).json({
        error: 'Nama customer kosong',
        message: 'Nama customer wajib diisi.',
      });
      return;
    }

    try {
      const mp = getMustikaPayClient();
      if (!mp) {
        throw new Error('Gagal menginisialisasi client MustikaPay SDK');
      }

      console.log(`\n[MustikaPay SDK] Calling createQris via mustikapay-node SDK`);
      console.log('Payload:', { amount: Math.floor(numAmount), product_name, customer_name, expiry });

      // Menggunakan method SDK resmi mustikapay-node
      const data: any = await (mp as any)._post('/api/v1/create/qris', {
        amount: Math.floor(numAmount),
        product_name: String(product_name).trim(),
        customer_name: String(customer_name).trim(),
        expiry: String(expiry || 30),
      });

      console.log(`[MustikaPay SDK Response]:`, data);

      // Defensive field extraction
      const qr_url = data?.data?.qr_url || data?.qr_url;
      const payment_link = data?.data?.payment_link || data?.payment_link;
      const ref_no = data?.data?.ref_no || data?.ref_no || data?.data?.reference || data?.reference;

      if (data?.status && data.status !== 'success' && data.status !== true) {
        res.status(400).json({
          error: data.message || 'Gagal membuat QRIS di MustikaPay',
          rawResponse: data,
        });
        return;
      }

      if (!ref_no) {
        res.status(502).json({
          error: 'Respons MustikaPay tidak menyertakan ref_no',
          rawResponse: data,
        });
        return;
      }

      // Store in memory
      const transaction: TransactionRecord = {
        ref_no,
        amount: numAmount,
        product_name: String(product_name).trim(),
        customer_name: String(customer_name).trim(),
        status: 'pending',
        qr_url,
        payment_link,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rawCreateResponse: data,
      };
      transactionsStore.set(ref_no, transaction);

      res.status(200).json({
        success: true,
        ref_no,
        qr_url,
        payment_link,
        amount: numAmount,
        product_name,
        customer_name,
        rawResponse: data,
      });
    } catch (error: any) {
      console.error('[MustikaPay Error] create-qris failed:', error);
      res.status(500).json({
        error: 'Gagal menghubungi server MustikaPay',
        details: error?.message || String(error),
      });
    }
  });

  // 4. Check Status Route Handler
  // GET /api/mustikapay/check-status?ref_no=...&type=qris
  app.get('/api/mustikapay/check-status', async (req: Request, res: Response): Promise<void> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(500).json({
        error: 'MUSTIKAPAY_API_KEY belum disetel',
        message: 'Silakan atur MUSTIKAPAY_API_KEY di .env.local atau di panel konfigurasi atas.',
      });
      return;
    }

    const ref_no = (req.query.ref_no as string)?.trim();
    if (!ref_no) {
      res.status(400).json({ error: 'Parameter ref_no diperlukan' });
      return;
    }

    try {
      const mp = getMustikaPayClient();
      if (!mp) {
        throw new Error('Gagal menginisialisasi client MustikaPay SDK');
      }

      console.log(`\n[MustikaPay SDK] Calling checkQrisStatus via mustikapay-node SDK for ref_no: ${ref_no}`);
      const data: any = await mp.checkQrisStatus(ref_no);
      console.log(`[MustikaPay SDK checkQrisStatus Response]:`, data);

      // Defensive status parsing
      const rawStatus = data?.data?.status || data?.status || 'pending';
      const cleanStatus = normalizeStatus(rawStatus);
      const receipt_url = data?.data?.receipt_url || data?.receipt_url;

      // Update in memory store if exists
      const existing = transactionsStore.get(ref_no);
      if (existing) {
        existing.status = cleanStatus;
        if (receipt_url) existing.receipt_url = receipt_url;
        if (data?.data?.issuer) existing.issuer = data.data.issuer;
        if (data?.data?.payor) existing.payor = data.data.payor;
        existing.updatedAt = new Date().toISOString();
        existing.rawCheckResponse = data;
        transactionsStore.set(ref_no, existing);
      }

      res.status(200).json({
        ref_no,
        status: cleanStatus,
        rawStatus,
        receipt_url,
        message: data.message,
        data: data.data || {},
        rawResponse: data,
      });
    } catch (error: any) {
      console.error('[MustikaPay Error] check-status failed:', error);
      res.status(500).json({
        error: 'Gagal menghubungi server MustikaPay',
        details: error?.message || String(error),
      });
    }
  });

  // 5. Get all transactions (for list view)
  // GET /api/transactions
  app.get('/api/transactions', (req: Request, res: Response): void => {
    const list = Array.from(transactionsStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({
      total: list.length,
      transactions: list,
    });
  });

  // GET /api/transactions/:ref_no
  app.get('/api/transactions/:ref_no', (req: Request, res: Response): void => {
    const ref_no = req.params.ref_no;
    const tx = transactionsStore.get(ref_no);
    if (!tx) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan dalam memori' });
      return;
    }
    res.json(tx);
  });

  // 6. Get webhook logs (for inspect view)
  // GET /api/webhook/logs
  app.get('/api/webhook/logs', (req: Request, res: Response): void => {
    res.json({
      total: webhookLogs.length,
      logs: webhookLogs,
    });
  });

  // 7. Helper for simulation: Generate signature and/or execute local simulated webhook
  // POST /api/webhook/simulate-test
  app.post('/api/webhook/simulate-test', async (req: Request, res: Response): Promise<void> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(400).json({
        error: 'API key belum disetel',
        message: 'Atur MUSTIKAPAY_API_KEY terlebih dahulu untuk menghitung signature HMAC.',
      });
      return;
    }

    const { payload, sendImmediately = false } = req.body;
    const rawBodyString = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    const signature = generateMustikaPaySignature(rawBodyString, apiKey);

    // If requested to send directly to local webhook endpoint
    if (sendImmediately) {
      try {
        const localWebhookUrl = `http://localhost:${PORT}/api/webhook/mustikapay`;
        const testRes = await fetch(localWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature,
          },
          body: rawBodyString,
        });

        const testData = await testRes.json().catch(() => ({}));
        res.json({
          success: testRes.ok,
          statusCode: testRes.status,
          signature,
          webhookResponse: testData,
        });
        return;
      } catch (err: any) {
        res.status(500).json({
          error: 'Gagal mengirim simulasi webhook internal',
          details: err?.message,
          signature,
        });
        return;
      }
    }

    res.json({
      signature,
      rawBody: rawBodyString,
      curlCommand: `curl -X POST http://localhost:${PORT}/api/webhook/mustikapay \\\n  -H "Content-Type: application/json" \\\n  -H "X-Signature: ${signature}" \\\n  -d '${rawBodyString.replace(/'/g, `'\\''`)}'`,
    });
  });

  // 8. Clear transactions & logs (convenient during testing)
  app.post('/api/reset-data', (req: Request, res: Response): void => {
    transactionsStore.clear();
    webhookLogs.length = 0;
    res.json({ success: true, message: 'Data transaksi & log webhook berhasil direset' });
  });

  // 9. Vite middleware for frontend SPA in development, or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(` MustikaPay Testing Server Ready!`);
    console.log(` Port: ${PORT}`);
    console.log(` Webhook URL: /api/webhook/mustikapay`);
    console.log(` Base API Target: ${MUSTIKAPAY_BASE_URL}`);
    console.log(` API Key Configured: ${Boolean(getApiKey()) ? 'YES' : 'NO'}`);
    console.log(`========================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
