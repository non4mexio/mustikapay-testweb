import React, { useState } from 'react';
import {
  ListFilter,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Trash2,
  Send,
  Database,
  QrCode,
  Smartphone,
  Building2,
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react';
import { TransactionRecord, PaymentMethod } from '../types';

interface TransactionsViewProps {
  transactions: TransactionRecord[];
  onRefreshList: () => void;
  onSelectRefNoForStatus: (ref_no: string) => void;
  onSelectRefNoForWebhook: (ref_no: string, amount: number) => void;
  onClearData: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onRefreshList,
  onSelectRefNoForStatus,
  onSelectRefNoForWebhook,
  onClearData,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'success' | 'expired'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const filtered = transactions.filter((t) => {
    if (statusFilter !== 'all' && t.status.toLowerCase() !== statusFilter) {
      return false;
    }
    if (methodFilter !== 'all' && (t.method || 'qris') !== methodFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = t.ref_no.toLowerCase().includes(q);
      const matchProduct = t.product_name?.toLowerCase().includes(q);
      const matchCustomer = t.customer_name?.toLowerCase().includes(q);
      const matchVa = t.va_number?.toLowerCase().includes(q);
      const matchRetail = t.retail_code?.toLowerCase().includes(q);
      return matchRef || matchProduct || matchCustomer || matchVa || matchRetail;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>PAID / SUCCESS</span>
          </span>
        );
      case 'expired':
      case 'cancel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="w-3 h-3 text-slate-500" />
            <span>EXPIRED</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  const getMethodBadge = (tx: TransactionRecord) => {
    const method = tx.method || 'qris';
    switch (method) {
      case 'ewallet':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Smartphone className="w-3 h-3 text-emerald-600" />
            <span>E-WALLET ({tx.channel || 'DANA'})</span>
          </span>
        );
      case 'va':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
            <Building2 className="w-3 h-3 text-sky-600" />
            <span>VA ({tx.channel || 'BANK'})</span>
          </span>
        );
      case 'retail':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Store className="w-3 h-3 text-amber-600" />
            <span>RETAIL ({tx.channel || 'GERAI'})</span>
          </span>
        );
      case 'qris':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <QrCode className="w-3 h-3 text-indigo-600" />
            <span>QRIS</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* SQLite Database Banner & Attribution */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Penyimpanan SQLite Terpadu</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold border border-emerald-300">
                  WAL Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Path: <span className="text-slate-700">data/mustikapay.sqlite</span> • Data aman saat server di-restart
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.noxlydev.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors inline-flex items-center gap-1"
            >
              <span>by NoxlyDev</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={onRefreshList}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium"
              title="Perbarui daftar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {transactions.length > 0 && (
              <button
                onClick={onClearData}
                className="p-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium"
                title="Kosongkan database transaksi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Database</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Method and Status filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setMethodFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  methodFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Metode
              </button>
              <button
                onClick={() => setMethodFilter('qris')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  methodFilter === 'qris' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                QRIS
              </button>
              <button
                onClick={() => setMethodFilter('ewallet')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  methodFilter === 'ewallet' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                E-Wallet
              </button>
              <button
                onClick={() => setMethodFilter('va')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  methodFilter === 'va' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Virtual Account
              </button>
              <button
                onClick={() => setMethodFilter('retail')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  methodFilter === 'retail' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Retail
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Status
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('success')}
                className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'success' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Success
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ref_no, produk, nama..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
            <ListFilter className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Belum ada transaksi di database</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Gunakan tab <strong className="text-slate-800">1. Multi-Payment</strong> untuk membuat tagihan baru via QRIS, E-Wallet, VA, atau Retail.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.ref_no}
              className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 transition-all shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {getMethodBadge(t)}
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {t.ref_no}
                  </span>
                  <button
                    onClick={() => copyRef(t.ref_no)}
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    title="Salin ref_no"
                  >
                    {copiedRef === t.ref_no ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-[11px] text-slate-400">
                    {new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(t.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Nominal Tagihan:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    Rp {Number(t.amount || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Pesanan & Pelanggan:</span>
                  <span className="font-medium text-slate-800 block truncate">{t.product_name || '-'}</span>
                  <span className="text-slate-500 text-[11px] block truncate">
                    {t.customer_name} {t.customer_phone ? `(${t.customer_phone})` : ''}
                  </span>
                </div>

                {/* Method Specific Details Column */}
                <div>
                  <span className="text-slate-400 text-[11px] block">Detail Metode Pembayaran:</span>
                  {t.method === 'va' && t.va_number && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        VA: {t.va_number}
                      </span>
                      <button
                        onClick={() => copyRef(t.va_number!)}
                        className="p-1 text-slate-400 hover:text-sky-700"
                        title="Salin VA"
                      >
                        {copiedRef === t.va_number ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}

                  {t.method === 'retail' && (t.retail_code || t.ref_no) && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Kode: {t.retail_code || t.ref_no}
                      </span>
                      <button
                        onClick={() => copyRef(t.retail_code || t.ref_no)}
                        className="p-1 text-slate-400 hover:text-amber-700"
                        title="Salin Kode Retail"
                      >
                        {copiedRef === (t.retail_code || t.ref_no) ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}

                  {t.method === 'ewallet' && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-emerald-700 font-medium">Channel: {t.channel}</span>
                      {t.checkout_url && (
                        <a
                          href={t.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-0.5 font-bold"
                        >
                          <span>Checkout Link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {(!t.method || t.method === 'qris') && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-indigo-700 font-medium">QRIS Dinamis</span>
                      {t.payment_link && (
                        <a
                          href={t.payment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-700 hover:underline inline-flex items-center gap-0.5 font-bold"
                        >
                          <span>Halaman Bayar</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                  {t.receipt_url && (
                    <a
                      href={t.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold font-sans"
                    >
                      <span>Lihat Struk / Bukti</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <span>Status: {t.status.toUpperCase()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectRefNoForWebhook(t.ref_no, t.amount)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3 h-3 text-slate-500" />
                    <span>Simulasi Webhook</span>
                  </button>

                  <button
                    onClick={() => onSelectRefNoForStatus(t.ref_no)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-indigo-200 transition-colors"
                  >
                    <span>Cek Status</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer NoxlyDev Credit */}
      <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Database SQLite: data/mustikapay.sqlite (Tersimpan otomatis)</span>
        </div>
        <a
          href="https://www.noxlydev.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-700 hover:text-indigo-900 font-bold inline-flex items-center gap-1"
        >
          <span>Developed by NoxlyDev • https://www.noxlydev.xyz</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
