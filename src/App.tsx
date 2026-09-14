import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Database, Heart } from 'lucide-react';
import { Header } from './components/Header';
import { CreateQrisView } from './components/CreateQrisView';
import { CheckStatusView } from './components/CheckStatusView';
import { TransactionsView } from './components/TransactionsView';
import { WebhookTesterView } from './components/WebhookTesterView';
import { DocsView } from './components/DocsView';
import { ConfigStatus, TransactionRecord } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'status' | 'transactions' | 'webhook' | 'docs'>('create');
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [selectedRefNo, setSelectedRefNo] = useState<string>('');
  const [selectedWebhookData, setSelectedWebhookData] = useState<{ refNo?: string; amount?: number }>({});

  // Detect URL path on mount (e.g. /status/QR123 or /status?ref_no=...)
  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const refFromQuery = searchParams.get('ref_no');

    if (refFromQuery) {
      setSelectedRefNo(refFromQuery);
      setActiveTab('status');
    } else if (path.startsWith('/status/')) {
      const parts = path.split('/status/');
      if (parts[1]) {
        setSelectedRefNo(decodeURIComponent(parts[1]));
        setActiveTab('status');
      }
    }
  }, []);

  // Fetch config status
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config-status');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      // Ignore background error
    }
  }, []);

  // Fetch transactions list
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchTransactions();
  }, [fetchConfig, fetchTransactions]);

  const handleQrisCreated = (tx: TransactionRecord) => {
    setTransactions((prev) => [tx, ...prev.filter((item) => item.ref_no !== tx.ref_no)]);
  };

  const handleNavigateToStatus = (ref_no: string) => {
    setSelectedRefNo(ref_no);
    setActiveTab('status');
    if (window.history.pushState) {
      window.history.pushState(null, '', `/status/${encodeURIComponent(ref_no)}`);
    }
  };

  const handleSelectRefNoForWebhook = (ref_no: string, amount: number) => {
    setSelectedWebhookData({ refNo: ref_no, amount });
    setActiveTab('webhook');
  };

  const handleStatusUpdated = (ref_no: string, newStatus: string, details: any) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.ref_no === ref_no) {
          return {
            ...t,
            status: newStatus,
            receipt_url: details.receipt_url || details.data?.receipt_url || t.receipt_url,
            issuer: details.data?.issuer || t.issuer,
            payor: details.data?.payor || t.payor,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const handleClearData = async () => {
    if (!window.confirm('Hapus semua riwayat transaksi & log webhook di memori server?')) {
      return;
    }
    try {
      await fetch('/api/reset-data', { method: 'POST' });
      setTransactions([]);
      setSelectedRefNo('');
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased">
      {/* Global Header */}
      <Header
        config={config}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'create') {
            window.history.pushState(null, '', '/');
          }
        }}
        onRefreshConfig={fetchConfig}
      />

      {/* Main Content Body */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        {activeTab === 'create' && (
          <CreateQrisView
            onQrisCreated={handleQrisCreated}
            onNavigateToStatus={handleNavigateToStatus}
            isConfigured={Boolean(config?.configured)}
          />
        )}

        {activeTab === 'status' && (
          <CheckStatusView
            currentRefNo={selectedRefNo}
            transactions={transactions}
            onStatusUpdated={handleStatusUpdated}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            onRefreshList={fetchTransactions}
            onSelectRefNoForStatus={handleNavigateToStatus}
            onSelectRefNoForWebhook={handleSelectRefNoForWebhook}
            onClearData={handleClearData}
          />
        )}

        {activeTab === 'webhook' && (
          <WebhookTesterView
            initialRefNo={selectedWebhookData.refNo}
            initialAmount={selectedWebhookData.amount}
            transactions={transactions}
            onWebhookTriggered={fetchTransactions}
          />
        )}

        {activeTab === 'docs' && <DocsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="font-semibold text-slate-800">MustikaPay Multi-Payment Suite</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono text-[11px]">
                <Database className="w-3 h-3" />
                <span>SQLite Persistence</span>
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Server-side route handlers, SQLite WAL database, and HMAC-SHA256 verified webhook receiver.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-1 text-slate-600 font-medium">
              <span>Crafted with</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>by</span>
              <a
                href="https://www.noxlydev.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 transition-colors"
              >
                <span>NoxlyDev</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="text-slate-400 text-[11px] font-mono">
              <a
                href="https://www.noxlydev.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600 transition-colors"
              >
                https://www.noxlydev.xyz
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
