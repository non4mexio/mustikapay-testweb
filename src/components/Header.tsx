import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, KeyRound, RefreshCw, ExternalLink } from 'lucide-react';
import { ConfigStatus } from '../types';

interface HeaderProps {
  config: ConfigStatus | null;
  activeTab: 'create' | 'status' | 'transactions' | 'webhook' | 'docs';
  setActiveTab: (tab: 'create' | 'status' | 'transactions' | 'webhook' | 'docs') => void;
  onRefreshConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activeTab,
  setActiveTab,
  onRefreshConfig,
}) => {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/config-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: inputKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMessage('API Key runtime berhasil diperbarui.');
        onRefreshConfig();
        setTimeout(() => {
          setShowKeyModal(false);
          setSaveMessage(null);
          setInputKey('');
        }, 1200);
      } else {
        setSaveMessage(data.error || 'Gagal menyimpan API key');
      }
    } catch {
      setSaveMessage('Gagal menghubungi server.');
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-base tracking-tight">
                  MustikaPay Tester
                </span>
                <span className="text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 font-mono">
                  mustikapay-node v1.4.1
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Powered by official Node.js SDK (QRIS, Cek Status & Webhook HMAC)
              </p>
            </div>
          </div>

          {/* API Key Status Pill & Actions */}
          <div className="flex items-center gap-2">
            <button
              id="api-key-status-btn"
              onClick={() => setShowKeyModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                config?.configured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Klik untuk melihat atau mengatur API Key"
            >
              {config?.configured ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Key: {config.keyMasked}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>API Key Belum Disetel</span>
                </>
              )}
            </button>

            <a
              href="https://mustikapayment.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-800 hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span>MustikaPay</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 -mb-px text-sm font-medium scrollbar-none">
          <button
            id="tab-create-btn"
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'create'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            1. Buat QRIS
          </button>
          <button
            id="tab-status-btn"
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'status'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            2. Cek Status
          </button>
          <button
            id="tab-transactions-btn"
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            3. Daftar Transaksi
          </button>
          <button
            id="tab-webhook-btn"
            onClick={() => setActiveTab('webhook')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'webhook'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            4. Webhook & curl
          </button>
          <button
            id="tab-docs-btn"
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'docs'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            5. Panduan & Notes
          </button>
        </nav>
      </div>

      {/* Modal API Key Setup */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Konfigurasi MustikaPay API Key</h3>
                <p className="text-xs text-slate-500">Kunci untuk autentikasi API dan verifikasi webhook HMAC</p>
              </div>
            </div>

            <div className="p-3 mb-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>
                <strong>Status Saat Ini:</strong>{' '}
                {config?.configured ? (
                  <span className="text-emerald-700 font-medium">Terkonfigurasi ({config.keyMasked})</span>
                ) : (
                  <span className="text-amber-700 font-medium">Belum terkonfigurasi</span>
                )}
              </p>
              <p>
                Di lingkungan lokal/produksi, setel di file <code className="bg-slate-200 px-1 py-0.5 rounded">.env.local</code>:
              </p>
              <pre className="bg-slate-900 text-slate-100 p-2 rounded text-[11px] font-mono mt-1 overflow-x-auto">
                MUSTIKAPAY_API_KEY="api_key_kamu_disini"
              </pre>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Atur atau Ganti API Key Runtime (untuk sesi testing saat ini):
                </label>
                <input
                  type="password"
                  id="runtime-api-key-input"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder={config?.configured ? 'Ketik API key baru atau biarkan kosong' : 'Masukkan API key MustikaPay'}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono"
                />
              </div>

              {saveMessage && (
                <div className="text-xs p-2.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                  {saveMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  id="close-api-key-modal-btn"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  id="save-api-key-modal-btn"
                  disabled={savingKey}
                  className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {savingKey && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan API Key</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
