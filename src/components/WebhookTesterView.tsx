import React, { useState, useEffect } from 'react';
import { Send, Copy, Check, RefreshCw, Terminal, CheckCircle2, XCircle, ShieldCheck, AlertCircle, Code, ChevronDown, ChevronUp, ExternalLink, Database } from 'lucide-react';
import { WebhookLogItem, TransactionRecord } from '../types';

interface WebhookTesterViewProps {
  initialRefNo?: string;
  initialAmount?: number;
  transactions: TransactionRecord[];
  onWebhookTriggered?: () => void;
}

export const WebhookTesterView: React.FC<WebhookTesterViewProps> = ({
  initialRefNo,
  initialAmount,
  transactions,
  onWebhookTriggered,
}) => {
  const defaultRef = initialRefNo || transactions[0]?.ref_no || 'QR1776670534209';
  const defaultAmt = initialAmount || transactions[0]?.amount || 22500;

  const [refNo, setRefNo] = useState(defaultRef);
  const [amount, setAmount] = useState(defaultAmt);
  const [serviceType, setServiceType] = useState<'QRIS' | 'EWALLET' | 'VA' | 'RETAIL'>('QRIS');
  const [issuer, setIssuer] = useState('DANA');
  const [payor, setPayor] = useState('081299887766');
  const [status, setStatus] = useState<'SUCCESS' | 'EXPIRED' | 'FAILED'>('SUCCESS');

  const [curlCommand, setCurlCommand] = useState('');
  const [signature, setSignature] = useState('');
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);

  const [sendingSimulation, setSendingSimulation] = useState(false);
  const [simulationFeedback, setSimulationFeedback] = useState<any | null>(null);

  const [webhookLogs, setWebhookLogs] = useState<WebhookLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Generate payload JSON
  const currentPayloadObject = {
    status: status.toLowerCase(),
    service: serviceType,
    amount: Number(amount),
    reference: refNo,
    order_id: null,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    data: {
      amount: Number(amount),
      net_amount: Math.round(Number(amount) * 0.993), // potong MDR asumsi ~0.7%
      issuer,
      payor,
      ref_no: refNo,
      status,
      type: serviceType,
      receipt_url: 'https://mustikapayment.com/receipt/sample.png',
    },
  };

  const payloadString = JSON.stringify(currentPayloadObject, null, 2);

  // Fetch updated HMAC & curl whenever payload changes
  useEffect(() => {
    const updateSignatureAndCurl = async () => {
      try {
        const res = await fetch('/api/webhook/simulate-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: currentPayloadObject }),
        });
        const data = await res.json();
        if (res.ok) {
          setSignature(data.signature || '');
          setCurlCommand(data.curlCommand || '');
        }
      } catch {
        // Ignore background errors
      }
    };

    updateSignatureAndCurl();
  }, [refNo, amount, serviceType, issuer, payor, status]);

  // Fetch webhook logs
  const fetchWebhookLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/webhook/logs');
      const data = await res.json();
      if (res.ok) {
        setWebhookLogs(data.logs || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchWebhookLogs();
  }, []);

  const handleSendSimulation = async () => {
    setSendingSimulation(true);
    setSimulationFeedback(null);
    try {
      const res = await fetch('/api/webhook/simulate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: currentPayloadObject,
          sendImmediately: true,
        }),
      });
      const data = await res.json();
      setSimulationFeedback(data);
      fetchWebhookLogs();
      if (onWebhookTriggered) {
        onWebhookTriggered();
      }
    } catch (err: any) {
      setSimulationFeedback({ error: err.message || 'Gagal mengirim simulasi.' });
    } finally {
      setSendingSimulation(false);
    }
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const copySig = () => {
    navigator.clipboard.writeText(signature);
    setCopiedSig(true);
    setTimeout(() => setCopiedSig(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Intro Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Terminal className="w-5 h-5 text-slate-700" />
              <span>Simulasi Webhook Receiver & HMAC-SHA256</span>
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Endpoint penerima webhook: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold">POST /api/webhook/mustikapay</code>.
              Server <strong>memverifikasi integritas raw body</strong> dengan membandingkan header <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">X-Signature</code> menggunakan HMAC-SHA256 dan API Key merchant.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://www.noxlydev.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-xl border border-indigo-200 transition-colors inline-flex items-center gap-1"
            >
              <span>by NoxlyDev</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>HMAC Active</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Generator Controls Column */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Parameter Payload Callback</h3>
            <span className="text-[11px] text-slate-500">Format: application/json</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Pick from existing transactions */}
            {transactions.length > 0 && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Pilih dari Transaksi Sesi Ini:
                </label>
                <select
                  value={refNo}
                  onChange={(e) => {
                    const found = transactions.find((t) => t.ref_no === e.target.value);
                    if (found) {
                      setRefNo(found.ref_no);
                      setAmount(found.amount);
                    } else {
                      setRefNo(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono"
                >
                  {transactions.map((t) => (
                    <option key={t.ref_no} value={t.ref_no}>
                      {t.ref_no} — Rp {t.amount.toLocaleString('id-ID')} ({t.product_name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Service Type Selector */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Layanan Pembayaran (service):
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(['QRIS', 'EWALLET', 'VA', 'RETAIL'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setServiceType(s);
                      if (s === 'VA') setIssuer('BCA');
                      if (s === 'RETAIL') setIssuer('ALFAMART');
                      if (s === 'EWALLET') setIssuer('DANA');
                      if (s === 'QRIS') setIssuer('QRIS');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-colors ${
                      serviceType === s
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference No */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Reference / ref_no:
              </label>
              <input
                type="text"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs"
              />
            </div>

            {/* Amount & Status Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nominal (amount):
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Status Transaksi:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold"
                >
                  <option value="SUCCESS">SUCCESS (Berhasil)</option>
                  <option value="EXPIRED">EXPIRED (Kedaluwarsa)</option>
                  <option value="FAILED">FAILED (Gagal)</option>
                </select>
              </div>
            </div>

            {/* Issuer & Payor Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Issuer (Bank/Wallet):
                </label>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="DANA / BCA / GOPAY"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Payor (Pengirim):
                </label>
                <input
                  type="text"
                  value={payor}
                  onChange={(e) => setPayor(e.target.value)}
                  placeholder="081299887766"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Live HMAC-SHA256 Signature */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700">Calculated X-Signature (HMAC-SHA256):</span>
                <button
                  onClick={copySig}
                  className="text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium"
                >
                  {copiedSig ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSig ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-800 break-all bg-white p-2 rounded-lg border border-slate-200">
                {signature || 'Menghitung signature...'}
              </div>
            </div>

            {/* Instant Simulation Button */}
            <div className="pt-2">
              <button
                id="btn-simulate-webhook-now"
                type="button"
                disabled={sendingSimulation || !signature}
                onClick={handleSendSimulation}
                className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {sendingSimulation ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengirim Webhook ke Server...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Simulasi Webhook Sekarang (1-Klik)</span>
                  </>
                )}
              </button>
            </div>

            {simulationFeedback && (
              <div
                className={`p-3 rounded-xl text-xs border ${
                  simulationFeedback.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {simulationFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    {simulationFeedback.success
                      ? 'Simulasi Berhasil Diterima & Diverifikasi (HTTP 200)'
                      : 'Simulasi Gagal'}
                  </span>
                </div>
                <p className="text-[11px] mt-1 text-slate-700">
                  {simulationFeedback.webhookResponse?.message ||
                    simulationFeedback.error ||
                    JSON.stringify(simulationFeedback)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Curl Command & Payload Column */}
        <div className="lg:col-span-6 space-y-4">
          {/* Curl Command Box */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-slate-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-purple-400" />
                <span>Contoh Perintah cURL</span>
              </span>
              <button
                id="btn-copy-curl-cmd"
                onClick={copyCurl}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center gap-1 font-medium"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'Tersalin' : 'Salin cURL'}</span>
              </button>
            </div>

            <pre className="text-[11px] font-mono leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 overflow-x-auto max-h-60 scrollbar-thin text-emerald-300">
              {curlCommand || `# Mempersiapkan curl command...`}
            </pre>
            <p className="text-[10px] text-slate-400">
              * Jalankan perintah cURL di atas dari terminal/command prompt untuk menguji endpoint secara eksternal.
            </p>
          </div>

          {/* Raw JSON Payload Preview */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
            <h4 className="text-xs font-semibold text-slate-700">Raw JSON Payload Body</h4>
            <pre className="bg-slate-50 text-slate-800 p-3 rounded-xl text-[11px] font-mono border border-slate-200 max-h-48 overflow-x-auto scrollbar-thin">
              {payloadString}
            </pre>
          </div>
        </div>
      </div>

      {/* Webhook History & Inspection Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <span>Log Webhook yang Masuk ke Server</span>
            </h3>
            <p className="text-xs text-slate-500">
              Riwayat callback yang diterima di endpoint <code className="font-mono">/api/webhook/mustikapay</code>
            </p>
          </div>

          <button
            onClick={fetchWebhookLogs}
            disabled={loadingLogs}
            className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs flex items-center gap-1"
            title="Refresh log webhook"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {webhookLogs.length > 0 ? (
          <div className="space-y-2">
            {webhookLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className="border border-slate-200 rounded-xl p-3 hover:bg-slate-50/50 transition-colors text-xs space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono">
                      {log.signatureValid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Signature VALID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-300">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Signature INVALID
                        </span>
                      )}
                      <span className="font-bold text-slate-800">{log.refNo || '(No Ref)'}</span>
                      <span className="text-slate-400">•</span>
                      <span className="uppercase text-[11px] text-slate-600 font-medium">
                        {log.status || 'UNKNOWN'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                      <span>{new Date(log.timestamp).toLocaleTimeString('id-ID')}</span>
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-0.5"
                      >
                        <span>{isExpanded ? 'Tutup' : 'Lihat Detail'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in">
                      <div className="text-[11px] text-slate-600">
                        <strong>X-Signature Header:</strong>{' '}
                        <span className="font-mono break-all">{log.signatureReceived || '(kosong)'}</span>
                      </div>
                      <div>
                        <strong className="text-[11px] text-slate-700 block mb-1">Payload JSON:</strong>
                        <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48 scrollbar-thin">
                          {JSON.stringify(log.parsedBody || log.rawBody, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
            Belum ada webhook yang diterima sejak server dinyalakan. Gunakan tombol "Kirim Simulasi Webhook Sekarang" di atas atau jalankan perintah cURL untuk memicu webhook pertama.
          </div>
        )}

        {webhookLogs.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>Semua callback webhook tersimpan otomatis di tabel SQLite (webhook_logs)</span>
            </div>
            <a
              href="https://www.noxlydev.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              <span>NoxlyDev • https://www.noxlydev.xyz</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
