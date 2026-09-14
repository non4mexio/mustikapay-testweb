import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Smartphone,
  Building2,
  Store,
} from 'lucide-react';
import { TransactionRecord, PaymentMethod } from '../types';

interface CheckStatusViewProps {
  currentRefNo: string;
  transactions: TransactionRecord[];
  onStatusUpdated?: (ref_no: string, newStatus: string, details: any) => void;
}

export const CheckStatusView: React.FC<CheckStatusViewProps> = ({
  currentRefNo,
  transactions,
  onStatusUpdated,
}) => {
  const [refNoInput, setRefNoInput] = useState(currentRefNo || '');
  const [methodInput, setMethodInput] = useState<PaymentMethod>('qris');
  const [loading, setLoading] = useState(false);
  const [statusResult, setStatusResult] = useState<{
    ref_no: string;
    method?: string;
    status: string;
    rawStatus?: string;
    receipt_url?: string;
    message?: string;
    data?: any;
    rawResponse?: any;
    lastChecked?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync when currentRefNo changes from outside
  useEffect(() => {
    if (currentRefNo) {
      setRefNoInput(currentRefNo);
      const matched = transactions.find((t) => t.ref_no === currentRefNo);
      if (matched?.method) {
        setMethodInput(matched.method);
      }
      fetchStatus(currentRefNo, matched?.method);
    }
  }, [currentRefNo, transactions]);

  const fetchStatus = async (targetRefNo: string, explicitMethod?: PaymentMethod) => {
    const trimmed = targetRefNo.trim();
    if (!trimmed) {
      setError('Masukkan ref_no transaksi terlebih dahulu.');
      return;
    }

    const matched = transactions.find((t) => t.ref_no === trimmed);
    const methodToUse = explicitMethod || matched?.method || methodInput || 'qris';

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/mustikapay/check-status?ref_no=${encodeURIComponent(trimmed)}&method=${encodeURIComponent(methodToUse)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Gagal mengecek status transaksi.');
      }

      const resObj = {
        ref_no: trimmed,
        method: data.method || methodToUse,
        status: data.status || 'pending',
        rawStatus: data.rawStatus,
        receipt_url: data.receipt_url || data.data?.receipt_url,
        message: data.message,
        data: data.data || {},
        rawResponse: data.rawResponse || data,
        lastChecked: new Date().toLocaleTimeString('id-ID'),
      };

      setStatusResult(resObj);

      if (onStatusUpdated) {
        onStatusUpdated(trimmed, data.status || 'pending', data);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memeriksa status.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatus(refNoInput, methodInput);
  };

  const copyRef = () => {
    if (statusResult?.ref_no) {
      navigator.clipboard.writeText(statusResult.ref_no);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Find local record details if available
  const localRecord = transactions.find((t) => t.ref_no === refNoInput.trim());

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'paid':
      case 'settlement':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>SUCCESS / BERHASIL</span>
          </div>
        );
      case 'expired':
      case 'cancel':
      case 'cancelled':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="w-4 h-4 text-slate-500" />
            <span>EXPIRED / KEDALUWARSA</span>
          </div>
        );
      case 'failed':
      case 'failure':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>FAILED / GAGAL</span>
          </div>
        );
      case 'pending':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>PENDING / MENUNGGU PEMBAYARAN</span>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search / Input Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              <span>Cek Status Transaksi MustikaPay</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Mendukung semua metode via <code className="font-mono text-slate-700">mustikapay-node SDK</code> & SQLite database sync
            </p>
          </div>
          <a
            href="https://www.noxlydev.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>by NoxlyDev</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-3 relative">
              <input
                id="search-ref-no-input"
                type="text"
                value={refNoInput}
                onChange={(e) => {
                  setRefNoInput(e.target.value);
                  const matched = transactions.find((t) => t.ref_no === e.target.value.trim());
                  if (matched?.method) setMethodInput(matched.method);
                }}
                placeholder="Masukkan ref_no transaksi (contoh: QR1776670534209)"
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>

            <select
              value={methodInput}
              onChange={(e) => setMethodInput(e.target.value as PaymentMethod)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="qris">QRIS (checkQrisStatus)</option>
              <option value="ewallet">E-Wallet (checkEwalletStatus)</option>
              <option value="va">VA (checkVaStatus)</option>
              <option value="retail">Retail (checkRetailStatus)</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              id="btn-check-status-submit"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Memeriksa...' : 'Cek Status Sekarang'}</span>
            </button>
          </div>
        </form>

        {/* Recent Transaction Suggestions */}
        {transactions.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500 block mb-1.5">
              Pilih dari database transaksi SQLite:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {transactions.slice(0, 8).map((t) => (
                <button
                  key={t.ref_no}
                  type="button"
                  onClick={() => {
                    setRefNoInput(t.ref_no);
                    if (t.method) setMethodInput(t.method);
                    fetchStatus(t.ref_no, t.method);
                  }}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                    refNoInput === t.ref_no
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-sans font-bold uppercase text-[9px] px-1 py-0.2 bg-slate-200 text-slate-700 rounded">
                    {t.method?.toUpperCase() || 'QRIS'}
                  </span>
                  <span>{t.ref_no}</span>
                  <span className="text-[10px] opacity-70">
                    (Rp {t.amount.toLocaleString('id-ID')})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Pengecekan Gagal</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Result Status Card */}
      {statusResult && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Hasil Pengecekan Status</h3>
                {statusResult.lastChecked && (
                  <span className="text-[11px] text-slate-400">
                    (Dicek: {statusResult.lastChecked})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {statusResult.ref_no}
                </span>
                <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {statusResult.method || 'qris'}
                </span>
                <button
                  onClick={copyRef}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Salin Ref"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {renderStatusBadge(statusResult.status)}
              <button
                id="btn-refresh-status-card"
                onClick={() => fetchStatus(statusResult.ref_no, methodInput)}
                disabled={loading}
                className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors"
                title="Refresh Status Ulang"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-700 block text-xs">Detail Transaksi:</span>
              <div className="space-y-1 text-slate-600">
                {localRecord?.channel && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Metode / Channel:</span>
                    <span className="font-bold text-slate-800 uppercase">
                      {localRecord.method} ({localRecord.channel})
                    </span>
                  </div>
                )}
                {localRecord?.va_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nomor VA:</span>
                    <span className="font-bold text-sky-800 font-mono">{localRecord.va_number}</span>
                  </div>
                )}
                {localRecord?.retail_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kode Pembayaran:</span>
                    <span className="font-bold text-amber-800 font-mono">{localRecord.retail_code}</span>
                  </div>
                )}
                {localRecord?.product_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Produk:</span>
                    <span className="font-medium text-slate-800">{localRecord.product_name}</span>
                  </div>
                )}
                {localRecord?.customer_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-medium text-slate-800">{localRecord.customer_name}</span>
                  </div>
                )}
                {(statusResult.data?.amount || localRecord?.amount) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nominal:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      Rp {(statusResult.data?.amount || localRecord?.amount).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                {statusResult.data?.net_amount && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Net Amount:</span>
                    <span className="font-medium text-emerald-700 font-mono">
                      Rp {Number(statusResult.data.net_amount).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                {statusResult.data?.issuer && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Issuer / Bank / Wallet:</span>
                    <span className="font-medium text-slate-800">{statusResult.data.issuer}</span>
                  </div>
                )}
                {statusResult.data?.payor && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payor / Pengirim:</span>
                    <span className="font-medium text-slate-800">{statusResult.data.payor}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Preview */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              {statusResult.status.toLowerCase() === 'success' && statusResult.receipt_url ? (
                <div className="space-y-2 text-center w-full">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Nota / Bukti Pembayaran (receipt_url)</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200 inline-block shadow-xs max-w-full overflow-hidden">
                    <img
                      src={statusResult.receipt_url}
                      alt="Nota MustikaPay"
                      className="max-h-56 max-w-full rounded-lg object-contain mx-auto"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="pt-1">
                    <a
                      href={statusResult.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <span>Buka nota asli di tab baru</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 space-y-1">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium text-slate-600">Bukti Transfer / Nota</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    {statusResult.status.toLowerCase() === 'success'
                      ? 'Tidak ada receipt_url yang dikembalikan dari API untuk transaksi ini.'
                      : 'Nota hanya tersedia setelah status transaksi berubah menjadi SUCCESS.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Raw JSON Accordion */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
            >
              <span>Lihat Raw JSON Response Pengecekan</span>
              {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showRawJson && (
              <pre className="mt-2 bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 scrollbar-thin">
                {JSON.stringify(statusResult.rawResponse, null, 2)}
              </pre>
            )}
          </div>

          {/* Footer NoxlyDev credit */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sinkronisasi otomatis dengan database SQLite</span>
            <a
              href="https://www.noxlydev.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              <span>Built by NoxlyDev (https://www.noxlydev.xyz)</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
