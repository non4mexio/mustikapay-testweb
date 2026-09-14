import React from 'react';
import { BookOpen, AlertTriangle, CheckCircle2, Server, Shield, ExternalLink } from 'lucide-react';

export const DocsView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-800">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-700" />
          <span>Panduan & Aturan Integrasi MustikaPay</span>
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Ringkasan spesifikasi teknis penting berdasarkan dokumentasi resmi MustikaPay untuk pengujian dan implementasi produksi.
        </p>
      </div>

      {/* Grid of Key Technical Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Rule 1: Auth & Base URL */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Shield className="w-4 h-4 text-slate-700" />
            <span>Autentikasi & Header</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Semua request ke API MustikaPay wajib menyertakan header:
          </p>
          <pre className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
            X-Api-Key: &lt;MUSTIKAPAY_API_KEY&gt;
          </pre>
          <p className="text-slate-500 text-[11px]">
            Base URL API: <code className="font-mono text-slate-800">https://mustikapayment.com</code>.
            API Key wajib dirahasiakan di server dan tidak boleh diekspos ke browser client.
          </p>
        </div>

        {/* Rule 2: Content-Types */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Server className="w-4 h-4 text-slate-700" />
            <span>Format Content-Type</span>
          </div>
          <ul className="space-y-1.5 text-slate-600 text-[11px]">
            <li className="flex items-start gap-1.5">
              <span className="font-bold text-slate-900">• Classic Create & Check:</span>
              <span>Wajib <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">application/x-www-form-urlencoded</code>.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="font-bold text-slate-900">• Webhook & SNAP:</span>
              <span>Menggunakan <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">application/json</code>.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="font-bold text-slate-900">• Minimal QRIS:</span>
              <span>Minimum nominal adalah Rp 1.000.</span>
            </li>
          </ul>
        </div>

        {/* Rule 3: Webhook HMAC-SHA256 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Verifikasi Signature Webhook</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Header <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">X-Signature</code> adalah hash <strong>HMAC-SHA256</strong> dari <strong>raw body mentah</strong> menggunakan API Key merchant:
          </p>
          <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-[11px] overflow-x-auto">
            HMAC_SHA256(rawBody, MUSTIKAPAY_API_KEY)
          </pre>
          <p className="text-[11px] text-slate-500">
            <strong>Penting:</strong> Jangan lakukan <code className="font-mono">JSON.parse()</code> lalu <code className="font-mono">JSON.stringify()</code> ulang sebelum memverifikasi signature karena urutan key dan spasi dapat berubah sehingga hash tidak cocok.
          </p>
        </div>

        {/* Rule 4: Hosting Constraint */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Ketentuan Hosting Produksi</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Untuk pemakaian <strong>produksi</strong>, MustikaPay mensyaratkan:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
            <li>Domain dan server sendiri dengan <strong>IP publik tetap</strong>.</li>
            <li>MustikaPay menolak platform shared gratis (Vercel, Railway, Render, Netlify, Replit, dsb) untuk transaksi/callback/API live.</li>
            <li>Untuk testing lokal, gunakan <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">localhost</code> atau temporary tunnel seperti <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">ngrok</code>.</li>
          </ul>
        </div>
      </div>

      {/* Official Node.js SDK highlight */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded">NPM</span>
            <h3 className="text-sm font-bold text-emerald-950">
              SDK Resmi: mustikapay-node (^1.4.1)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
            Terpasang & Aktif
          </span>
        </div>
        <p className="text-xs text-emerald-900 leading-relaxed">
          Aplikasi ini telah terintegrasi dengan modul resmi <strong>mustikapay-node</strong>. Kamu tidak perlu lagi membuat HTTP request manual maupun hashing HMAC manual:
        </p>

        <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto">
{`// 1. Install package resmi
npm install mustikapay-node

// 2. Inisialisasi client
import MustikaPay from 'mustikapay-node';
const mp = new MustikaPay({ apiKey: process.env.MUSTIKAPAY_API_KEY });

// 3. Buat QRIS
const qris = await mp.createQris(10000);
// 3. Create QRIS
const qris = await mp.createQris({ amount: 25000, productName: 'Order #123' });

// 4. Create E-Wallet (DANA, OVO, GOPAY, SHOPEEPAY, LINKAJA)
const ewallet = await mp.createEwallet({
  amount: 25000,
  productCode: 'DANA',
  phone: '08123456789',
  name: 'Budi Tester',
});

// 5. Create Virtual Account (BCA, BRI, BNI, MANDIRI, PERMATA, CIMB, BSI)
const va = await mp.createVa({
  amount: 50000,
  bankCode: 'BCA',
  name: 'Budi Tester',
  phone: '08123456789',
});

// 6. Create Retail (ALFAMART / INDOMARET)
const retail = await mp.createRetail({
  amount: 50000,
  retailOutlet: 'ALFAMART',
  name: 'Budi Tester',
});

// 7. Check Status (Semua Metode)
const statusQris = await mp.checkQrisStatus('QR123...');
const statusEwallet = await mp.checkEwalletStatus('EW123...');
const statusVa = await mp.checkVaStatus('VA123...');
const statusRetail = await mp.checkRetailStatus('RT123...');

// 8. Verifikasi Webhook Callback
const isValid = mp.verifyCallback(rawBodyString, signatureHeader);`}
        </pre>
      </div>

      {/* NoxlyDev Attribution Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="font-bold text-base block">Dikembangkan oleh NoxlyDev</span>
          <p className="text-xs text-indigo-200">
            Solusi integrasi payment gateway dan arsitektur web modern dengan SQLite database persistence.
          </p>
        </div>
        <a
          href="https://www.noxlydev.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors shrink-0"
        >
          <span>Kunjungi noxlydev.xyz</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Code Snippet for Next.js App Router (if user copies to Next.js) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Implementasi di Next.js App Router (Route Handlers)
        </h3>
        <p className="text-xs text-slate-600">
          Jika kamu ingin menyalin logika ini ke project Next.js App Router murni:
        </p>

        <div className="space-y-2 text-xs">
          <span className="font-semibold text-slate-700 block">app/api/webhook/mustikapay/route.ts:</span>
          <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto">
{`import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // WAJIB text() mentah
  const signature = req.headers.get('x-signature') || req.headers.get('X-Signature');
  const apiKey = process.env.MUSTIKAPAY_API_KEY || '';

  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
    .update(rawBody)
    .digest('hex');

  if (!signature || signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const payload = JSON.parse(rawBody);
  console.log('Webhook valid:', payload);

  // Update status transaksi di database / state...
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
