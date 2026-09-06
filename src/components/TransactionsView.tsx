import React, { useState } from 'react';
import { ListFilter, RefreshCw, Copy, Check, ExternalLink, ArrowRight, Trash2, Send } from 'lucide-react';
import { TransactionRecord } from '../types';

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
  const [filter, setFilter] = useState<'all' | 'pending' | 'success' | 'expired'>('all');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const filtered = transactions.filter((t) => {
    if (filter === 'all') return true;
    return t.status.toLowerCase() === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            SUCCESS
          </span>
        );
      case 'expired':
      case 'cancel':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            EXPIRED
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-slate-700" />
              <span>Daftar Transaksi Testing</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Disimpan di penyimpanan memori server untuk kemudahan monitoring testing manual
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshList}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Perbarui daftar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {transactions.length > 0 && (
              <button
                onClick={onClearData}
                className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
                title="Kosongkan memori testing"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              filter === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Semua ({transactions.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              filter === 'pending'
                ? 'bg-amber-700 text-white border-amber-700'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            Pending ({transactions.filter((t) => t.status.toLowerCase() === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              filter === 'success'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Success ({transactions.filter((t) => t.status.toLowerCase() === 'success').length})
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              filter === 'expired'
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Expired ({transactions.filter((t) => t.status.toLowerCase() === 'expired').length})
          </button>
        </div>

        {/* Transactions Table */}
        {filtered.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">Ref No</th>
                  <th className="py-3 px-3.5">Produk & Customer</th>
                  <th className="py-3 px-3.5">Nominal</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Waktu Dibuat</th>
                  <th className="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filtered.map((tx) => (
                  <tr key={tx.ref_no} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{tx.ref_no}</span>
                        <button
                          onClick={() => copyRef(tx.ref_no)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="Salin ref_no"
                        >
                          {copiedRef === tx.ref_no ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-medium text-slate-800">{tx.product_name}</div>
                      <div className="text-[11px] text-slate-500">{tx.customer_name}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono font-semibold text-slate-900">
                      Rp {tx.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3.5">
                      {getStatusBadge(tx.status)}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                      {new Date(tx.createdAt).toLocaleTimeString('id-ID')} • {new Date(tx.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectRefNoForStatus(tx.ref_no)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-medium text-[11px] transition-colors flex items-center gap-1"
                          title="Cek Status Transaksi"
                        >
                          <span>Cek</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onSelectRefNoForWebhook(tx.ref_no, tx.amount)}
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-md font-medium text-[11px] transition-colors flex items-center gap-1"
                          title="Simulasikan Webhook Sukses"
                        >
                          <Send className="w-3 h-3 text-purple-600" />
                          <span>Simulasi Webhook</span>
                        </button>
                        {tx.payment_link && (
                          <a
                            href={tx.payment_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Buka Payment Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-slate-700">Tidak ada transaksi ditemukan</p>
            <p className="text-xs text-slate-400">
              Belum ada riwayat transaksi dengan filter yang dipilih. Silakan buat QRIS baru di tab "Buat QRIS".
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
