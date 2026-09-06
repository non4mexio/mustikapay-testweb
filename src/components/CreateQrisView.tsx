import React, { useState } from 'react';
import { QrCode, Copy, Check, ExternalLink, ArrowRight, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { TransactionRecord } from '../types';

interface CreateQrisViewProps {
  onQrisCreated: (tx: TransactionRecord) => void;
  onNavigateToStatus: (ref_no: string) => void;
  isConfigured: boolean;
}

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 25000, 50000];

export const CreateQrisView: React.FC<CreateQrisViewProps> = ({
  onQrisCreated,
  onNavigateToStatus,
  isConfigured,
}) => {
  const [amount, setAmount] = useState<number | ''>(1000);
  const [productName, setProductName] = useState('Testing Order QRIS');
  const [customerName, setCustomerName] = useState('Budi Tester');
  const [expiry, setExpiry] = useState<number>(30);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    ref_no: string;
    qr_url?: string;
    payment_link?: string;
    amount: number;
    product_name: string;
    customer_name: string;
    rawResponse?: any;
  } | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 1000) {
      setError('Nominal minimal adalah Rp 1.000 (sesuai batasan aman API MustikaPay).');
      return;
    }

    if (!productName.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }

    if (!customerName.trim()) {
      setError('Nama customer wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/mustikapay/create-qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          product_name: productName.trim(),
          customer_name: customerName.trim(),
          expiry,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Gagal membuat QRIS.');
      }

      const result = {
        ref_no: data.ref_no,
        qr_url: data.qr_url,
        payment_link: data.payment_link,
        amount: numAmount,
        product_name: productName.trim(),
        customer_name: customerName.trim(),
        rawResponse: data.rawResponse || data,
      };

      setLastResult(result);

      // Notify parent to record transaction in state
      onQrisCreated({
        ref_no: data.ref_no,
        amount: numAmount,
        product_name: productName.trim(),
        customer_name: customerName.trim(),
        status: 'pending',
        qr_url: data.qr_url,
        payment_link: data.payment_link,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rawCreateResponse: data.rawResponse,
      });
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memanggil server API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!isConfigured && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Perhatian: MUSTIKAPAY_API_KEY belum disetel</p>
            <p className="text-xs text-amber-800">
              Permintaan ke server MustikaPay memerlukan API key asli dari dashboard MustikaPay.
              Silakan atur di tombol <span className="font-mono bg-amber-100 px-1 py-0.5 rounded">API Key</span> di header atas atau pada file <span className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env.local</span>.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <QrCode className="w-5 h-5 text-slate-700" />
              <span>Form Buat QRIS</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Endpoint: <code className="font-mono text-slate-700">POST /api/v1/create/qris</code> (form-urlencoded)
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label htmlFor="input-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                Nominal Transaksi (IDR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  Rp
                </span>
                <input
                  id="input-amount"
                  type="number"
                  min="1000"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="1000"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-colors ${
                      amount === val
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Rp {val.toLocaleString('id-ID')}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                * Asumsi aman: minimum Rp 1.000 untuk pengujian QRIS.
              </p>
            </div>

            {/* Product Name */}
            <div>
              <label htmlFor="input-product-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Produk <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-product-name"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Kopi Susu Aren"
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>

            {/* Customer Name */}
            <div>
              <label htmlFor="input-customer-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Customer <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-customer-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>

            {/* Expiry Input */}
            <div>
              <label htmlFor="input-expiry" className="block text-xs font-semibold text-slate-700 mb-1">
                Masa Berlaku / Expiry (Menit)
              </label>
              <input
                id="input-expiry"
                type="number"
                min="5"
                max="1440"
                value={expiry}
                onChange={(e) => setExpiry(Number(e.target.value) || 30)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Default 30 menit.</p>
            </div>

            {/* Submit Button */}
            <button
              id="submit-create-qris-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses ke MustikaPay...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Bayar dengan QRIS</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result Column */}
        <div className="lg:col-span-6 space-y-4">
          {lastResult ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hasil Pembuatan QRIS</h3>
                  <p className="text-xs text-slate-500">Scan QR Code dengan e-wallet / banking</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  Status: Pending
                </span>
              </div>

              {/* QR Image */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                {lastResult.qr_url ? (
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                    <img
                      src={lastResult.qr_url}
                      alt="QR Code MustikaPay"
                      className="w-56 h-56 object-contain"
                      onError={(e) => {
                        // Fallback image error text
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-slate-200 rounded-lg text-xs text-slate-500 text-center p-4">
                    QR URL tidak ditemukan di response
                  </div>
                )}

                <div className="mt-3 text-center">
                  <p className="text-base font-bold text-slate-900 font-mono">
                    Rp {lastResult.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-slate-500">{lastResult.product_name} • {lastResult.customer_name}</p>
                </div>
              </div>

              {/* Reference & Links */}
              <div className="space-y-2.5 text-xs">
                {/* ref_no */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block">Reference No (ref_no):</span>
                    <span className="font-mono font-semibold text-slate-900 text-sm">{lastResult.ref_no}</span>
                  </div>
                  <button
                    id="copy-ref-no-btn"
                    onClick={() => copyToClipboard(lastResult.ref_no, 'ref_no')}
                    className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    title="Salin ref_no"
                  >
                    {copiedField === 'ref_no' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* payment_link */}
                {lastResult.payment_link && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-slate-500 block">Payment Link:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={lastResult.payment_link}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-700 truncate"
                      />
                      <button
                        onClick={() => copyToClipboard(lastResult.payment_link!, 'payment_link')}
                        className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors shrink-0"
                        title="Salin Link"
                      >
                        {copiedField === 'payment_link' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={lastResult.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors shrink-0"
                        title="Buka Link di Tab Baru"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Action: Check Status */}
              <div className="pt-2">
                <button
                  id="go-to-check-status-btn"
                  onClick={() => onNavigateToStatus(lastResult.ref_no)}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>Cek Status Transaksi Ini</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Toggle Raw JSON Response */}
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <span>Lihat Raw JSON Response</span>
                  {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showRawJson && (
                  <pre className="mt-2 bg-slate-900 text-slate-100 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 scrollbar-thin">
                    {JSON.stringify(lastResult.rawResponse, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Belum Ada QRIS Aktif</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Isi form di samping dengan nominal minimal Rp 1.000 lalu klik tombol "Bayar dengan QRIS" untuk menghasilkan barcode pembayaran.
                </p>
              </div>
              <div className="pt-2 text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ketentuan Teknis MustikaPay:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
                  <li>Mengirim request URL-encoded ke <code className="font-mono">/api/v1/create/qris</code></li>
                  <li>Wajib header autentikasi <code className="font-mono">X-Api-Key</code></li>
                  <li>Simpan <code className="font-mono">ref_no</code> untuk keperluan pengecekan status & webhook</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
