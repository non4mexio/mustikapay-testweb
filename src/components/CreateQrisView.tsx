import React, { useState } from 'react';
import {
  QrCode,
  Smartphone,
  Building2,
  Store,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  CreditCard,
  PhoneCall,
  ShieldCheck,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { TransactionRecord, PaymentMethod } from '../types';

interface CreateQrisViewProps {
  onQrisCreated: (tx: TransactionRecord) => void;
  onNavigateToStatus: (ref_no: string) => void;
  isConfigured: boolean;
}

const QUICK_AMOUNTS_QRIS = [1000, 2000, 5000, 10000, 25000, 50000];
const QUICK_AMOUNTS_VA = [10000, 25000, 50000, 100000, 250000];

const EWALLET_PROVIDERS = [
  { code: 'DANA', name: 'DANA', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { code: 'OVO', name: 'OVO', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { code: 'GOPAY', name: 'GoPay', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { code: 'SHOPEEPAY', name: 'ShopeePay', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { code: 'LINKAJA', name: 'LinkAja', color: 'bg-red-50 text-red-700 border-red-200' },
];

const VA_BANKS = [
  { code: 'BCA', name: 'Bank Central Asia (BCA)' },
  { code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)' },
  { code: 'BNI', name: 'Bank Negara Indonesia (BNI)' },
  { code: 'MANDIRI', name: 'Bank Mandiri' },
  { code: 'PERMATA', name: 'Bank Permata' },
  { code: 'CIMB', name: 'CIMB Niaga' },
  { code: 'BSI', name: 'Bank Syariah Indonesia (BSI)' },
];

const RETAIL_OUTLETS = [
  { code: 'ALFAMART', name: 'Alfamart / Alfamidi / Dan+Dan', desc: 'Bayar via kasir Alfamart seluruh Indonesia' },
  { code: 'INDOMARET', name: 'Indomaret / Ceriamart', desc: 'Bayar via kasir Indomaret seluruh Indonesia' },
];

export const CreateQrisView: React.FC<CreateQrisViewProps> = ({
  onQrisCreated,
  onNavigateToStatus,
  isConfigured,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('qris');

  // Common Form Fields
  const [amount, setAmount] = useState<number | ''>(1000);
  const [productName, setProductName] = useState('Testing Order Multi-Payment');
  const [customerName, setCustomerName] = useState('Budi Tester');
  const [customerPhone, setCustomerPhone] = useState('081234567890');
  const [expiry, setExpiry] = useState<number>(30);

  // Method-Specific Fields
  const [ewalletProvider, setEwalletProvider] = useState('DANA');
  const [vaBank, setVaBank] = useState('BCA');
  const [retailOutlet, setRetailOutlet] = useState<'ALFAMART' | 'INDOMARET'>('ALFAMART');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TransactionRecord | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Switch method default amount
  const handleSelectMethod = (m: PaymentMethod) => {
    setSelectedMethod(m);
    setError(null);
    if ((m === 'va' || m === 'retail') && (typeof amount === 'number' && amount < 10000)) {
      setAmount(10000);
    } else if (m === 'qris' && amount === 10000) {
      // keep or allow 1000
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    const minRequired = selectedMethod === 'va' || selectedMethod === 'retail' ? 10000 : 1000;

    if (isNaN(numAmount) || numAmount < minRequired) {
      setError(`Nominal minimal untuk metode ${selectedMethod.toUpperCase()} adalah Rp ${minRequired.toLocaleString('id-ID')}.`);
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

    if ((selectedMethod === 'ewallet' || selectedMethod === 'va') && !customerPhone.trim()) {
      setError('Nomor HP customer wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      let endpoint = '/api/mustikapay/create-qris';
      let payload: any = {};

      if (selectedMethod === 'qris') {
        endpoint = '/api/mustikapay/create-qris';
        payload = {
          amount: numAmount,
          product_name: productName.trim(),
          customer_name: customerName.trim(),
          expiry,
        };
      } else if (selectedMethod === 'ewallet') {
        endpoint = '/api/mustikapay/create-ewallet';
        payload = {
          amount: numAmount,
          product_code: ewalletProvider,
          phone: customerPhone.trim(),
          customer_name: customerName.trim(),
          product_name: productName.trim(),
        };
      } else if (selectedMethod === 'va') {
        endpoint = '/api/mustikapay/create-va';
        payload = {
          amount: numAmount,
          bank_code: vaBank,
          customer_name: customerName.trim(),
          phone: customerPhone.trim(),
          product_name: productName.trim(),
        };
      } else if (selectedMethod === 'retail') {
        endpoint = '/api/mustikapay/create-retail';
        payload = {
          amount: numAmount,
          retail_outlet: retailOutlet,
          customer_name: customerName.trim(),
          product_name: productName.trim(),
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Gagal membuat tagihan pembayaran.');
      }

      const newRecord: TransactionRecord = {
        ref_no: data.ref_no,
        method: selectedMethod,
        channel: data.channel || (selectedMethod === 'ewallet' ? ewalletProvider : selectedMethod === 'va' ? vaBank : selectedMethod === 'retail' ? retailOutlet : 'QRIS'),
        amount: numAmount,
        product_name: productName.trim(),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        status: 'pending',
        qr_url: data.qr_url,
        payment_link: data.payment_link || data.checkout_url,
        checkout_url: data.checkout_url,
        va_number: data.va_number,
        retail_code: data.retail_code,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rawCreateResponse: data.rawResponse || data,
      };

      setLastResult(newRecord);
      onQrisCreated(newRecord);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Credit Attribution Badge */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center font-bold text-lg text-indigo-200">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">MustikaPay Multi-Payment Engine</span>
              <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                SQLite Persistence
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Mendukung QRIS Dinamis, E-Wallet, Virtual Account Bank & Retail Alfamart/Indomaret
            </p>
          </div>
        </div>
        <a
          href="https://www.noxlydev.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white px-3 py-1.5 rounded-xl border border-white/15 transition-all inline-flex items-center gap-1.5 shrink-0"
        >
          <span>Crafted by NoxlyDev</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">MUSTIKAPAY_API_KEY Belum Disetel</p>
            <p>
              Untuk melakukan request real ke API MustikaPay, masukkan API key Anda melalui tombol status di pojok kanan atas atau atur di file{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env.local</code>.
            </p>
          </div>
        </div>
      )}

      {/* Main Payment Creation Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>Pilih Metode Pembayaran</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Buat transaksi instan dan simpan otomatis ke database SQLite internal
          </p>
        </div>

        {/* Payment Method Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. QRIS */}
          <button
            type="button"
            onClick={() => handleSelectMethod('qris')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
              selectedMethod === 'qris'
                ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${selectedMethod === 'qris' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <QrCode className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Instant</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">QRIS Dinamis</span>
              <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">Semua e-wallet & bank</span>
            </div>
          </button>

          {/* 2. E-Wallet */}
          <button
            type="button"
            onClick={() => handleSelectMethod('ewallet')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
              selectedMethod === 'ewallet'
                ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${selectedMethod === 'ewallet' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">App</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">E-Wallet</span>
              <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">DANA, OVO, GoPay, Shopee</span>
            </div>
          </button>

          {/* 3. Virtual Account */}
          <button
            type="button"
            onClick={() => handleSelectMethod('va')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
              selectedMethod === 'va'
                ? 'border-sky-600 bg-sky-50/60 ring-2 ring-sky-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${selectedMethod === 'va' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transfer</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">Virtual Account</span>
              <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">BCA, BRI, BNI, Mandiri</span>
            </div>
          </button>

          {/* 4. Retail Outlet */}
          <button
            type="button"
            onClick={() => handleSelectMethod('retail')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
              selectedMethod === 'retail'
                ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${selectedMethod === 'retail' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Store className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">Gerai Retail</span>
              <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">Alfamart & Indomaret</span>
            </div>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Gagal Membuat Transaksi:</span>
              <span className="text-rose-700">{error}</span>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Method-Specific Selector options */}
          {selectedMethod === 'ewallet' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Pilih E-Wallet Provider</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {EWALLET_PROVIDERS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setEwalletProvider(p.code)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      ewalletProvider === p.code
                        ? `${p.color} ring-2 ring-slate-800/10 shadow-xs`
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedMethod === 'va' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Pilih Bank Virtual Account</label>
              <select
                value={vaBank}
                onChange={(e) => setVaBank(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                {VA_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedMethod === 'retail' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Pilih Gerai Retail</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RETAIL_OUTLETS.map((o) => (
                  <button
                    key={o.code}
                    type="button"
                    onClick={() => setRetailOutlet(o.code as 'ALFAMART' | 'INDOMARET')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      retailOutlet === o.code
                        ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-xs text-slate-900 block">{o.name}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nominal Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="amount-input" className="block text-xs font-semibold text-slate-700">
                Nominal Tagihan (IDR)
              </label>
              <span className="text-[11px] text-slate-400">
                Min: Rp {selectedMethod === 'va' || selectedMethod === 'retail' ? '10.000' : '1.000'}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 font-mono">
                Rp
              </span>
              <input
                id="amount-input"
                type="number"
                min={selectedMethod === 'va' || selectedMethod === 'retail' ? 10000 : 1000}
                step={500}
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
                placeholder="10000"
                required
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(selectedMethod === 'va' || selectedMethod === 'retail' ? QUICK_AMOUNTS_VA : QUICK_AMOUNTS_QRIS).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-colors ${
                    amount === amt
                      ? 'bg-slate-900 text-white border-slate-900 font-medium'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Rp {amt.toLocaleString('id-ID')}
                </button>
              ))}
            </div>
          </div>

          {/* Product Name & Customer Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="product-name-input" className="block text-xs font-semibold text-slate-700">
                Nama Produk / Pesanan
              </label>
              <input
                id="product-name-input"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="Contoh: Paket Premium VIP"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="customer-name-input" className="block text-xs font-semibold text-slate-700">
                Nama Pelanggan
              </label>
              <input
                id="customer-name-input"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="Contoh: Budi Santoso"
                required
              />
            </div>
          </div>

          {/* Customer Phone & Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="customer-phone-input" className="block text-xs font-semibold text-slate-700">
                Nomor HP Customer {(selectedMethod === 'ewallet' || selectedMethod === 'va') && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="customer-phone-input"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
                placeholder="08123456789"
                required={selectedMethod === 'ewallet' || selectedMethod === 'va'}
              />
            </div>

            {selectedMethod === 'qris' ? (
              <div className="space-y-1.5">
                <label htmlFor="expiry-select" className="block text-xs font-semibold text-slate-700">
                  Masa Berlaku QRIS
                </label>
                <select
                  id="expiry-select"
                  value={expiry}
                  onChange={(e) => setExpiry(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                >
                  <option value={15}>15 Menit</option>
                  <option value={30}>30 Menit (Direkomendasikan)</option>
                  <option value={60}>60 Menit (1 Jam)</option>
                  <option value={1440}>1440 Menit (24 Jam)</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-5 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Otomatis diverifikasi oleh SDK MustikaPay & webhook HMAC</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              id="submit-payment-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Menghubungi API MustikaPay...</span>
                </>
              ) : (
                <>
                  {selectedMethod === 'qris' && <QrCode className="w-4 h-4 text-indigo-400" />}
                  {selectedMethod === 'ewallet' && <Smartphone className="w-4 h-4 text-emerald-400" />}
                  {selectedMethod === 'va' && <Building2 className="w-4 h-4 text-sky-400" />}
                  {selectedMethod === 'retail' && <Store className="w-4 h-4 text-amber-400" />}
                  <span>
                    Buat Tagihan {selectedMethod === 'qris' ? 'QRIS' : selectedMethod === 'ewallet' ? `E-Wallet (${ewalletProvider})` : selectedMethod === 'va' ? `VA ${vaBank}` : `Retail ${retailOutlet}`} (Rp {Number(amount || 0).toLocaleString('id-ID')})
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Result Section (Displays the generated payment) */}
      {lastResult && (
        <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500/30 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="font-bold text-slate-900 text-base">
                Tagihan Berhasil Dibuat ({lastResult.method?.toUpperCase()} - {lastResult.channel})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-semibold">
                Ref: {lastResult.ref_no}
              </span>
              <button
                onClick={() => copyToClipboard(lastResult.ref_no, 'ref_no')}
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500"
                title="Salin Reference Number"
              >
                {copiedField === 'ref_no' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* METHOD 1: QRIS OUTPUT */}
          {lastResult.method === 'qris' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                {lastResult.qr_url ? (
                  <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">
                    <img
                      src={lastResult.qr_url}
                      alt="QRIS Code MustikaPay"
                      className="w-56 h-56 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-56 h-56 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                    QR Image URL tidak disediakan
                  </div>
                )}
                <span className="text-[11px] text-slate-500 mt-3 font-medium">
                  Scan pakai GoPay, OVO, DANA, BCA Mobile, dll
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Nominal:</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      Rp {lastResult.amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Produk:</span>
                    <span className="font-medium text-slate-800">{lastResult.product_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Pelanggan:</span>
                    <span className="font-medium text-slate-800">{lastResult.customer_name}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Status Awal:</span>
                    <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      PENDING
                    </span>
                  </div>
                </div>

                {lastResult.payment_link && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700 block">Payment Link (Halaman Bayar):</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={lastResult.payment_link}
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(lastResult.payment_link!, 'pay_link')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1 shrink-0"
                      >
                        {copiedField === 'pay_link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Salin</span>
                      </button>
                      <a
                        href={lastResult.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 border border-indigo-200"
                      >
                        <span>Buka</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* METHOD 2: E-WALLET OUTPUT */}
          {lastResult.method === 'ewallet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block">
                    E-Wallet {lastResult.channel}
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 font-mono block mt-1">
                    Rp {lastResult.amount.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-500 block mt-1 font-mono">
                    Nomor: {lastResult.customer_phone}
                  </span>
                </div>

                {lastResult.checkout_url && (
                  <a
                    href={lastResult.checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <span>Lanjutkan Pembayaran di {lastResult.channel}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Ref No:</span>
                    <span className="font-mono text-slate-900 font-bold">{lastResult.ref_no}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">E-Wallet:</span>
                    <span className="font-bold text-emerald-700">{lastResult.channel}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Nama Akun:</span>
                    <span className="font-medium text-slate-800">{lastResult.customer_name}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      PENDING
                    </span>
                  </div>
                </div>

                {lastResult.checkout_url && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700 block">Checkout URL:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={lastResult.checkout_url}
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(lastResult.checkout_url!, 'checkout_url')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1 shrink-0"
                      >
                        {copiedField === 'checkout_url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Salin</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* METHOD 3: VIRTUAL ACCOUNT OUTPUT */}
          {lastResult.method === 'va' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wide block">
                  Virtual Account Bank {lastResult.channel}
                </span>

                <div className="bg-white p-3 rounded-xl border border-sky-200 inline-block w-full">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Nomor Virtual Account</span>
                  <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-wider block my-1">
                    {lastResult.va_number || 'Menunggu Nomor VA...'}
                  </span>
                  {lastResult.va_number && (
                    <button
                      onClick={() => copyToClipboard(lastResult.va_number!, 'va_num')}
                      className="mt-1 text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 px-3 py-1 bg-sky-50 rounded-lg border border-sky-200"
                    >
                      {copiedField === 'va_num' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Salin Nomor VA</span>
                    </button>
                  )}
                </div>

                <span className="text-xs text-slate-600 block">
                  Total Tagihan: <strong className="text-slate-900 font-mono">Rp {lastResult.amount.toLocaleString('id-ID')}</strong>
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 pb-1 border-b border-slate-200">
                    Instruksi Pembayaran {lastResult.channel} VA:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                    <li>Buka aplikasi Mobile Banking / ATM {lastResult.channel}</li>
                    <li>Pilih menu <strong>Transfer</strong> &gt; <strong>Virtual Account</strong></li>
                    <li>Masukkan nomor VA di samping</li>
                    <li>Pastikan nama pelanggan: <strong>{lastResult.customer_name}</strong></li>
                    <li>Konfirmasi nominal Rp {lastResult.amount.toLocaleString('id-ID')} dan bayar</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* METHOD 4: RETAIL OUTPUT */}
          {lastResult.method === 'retail' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  <Store className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide block">
                  Gerai Retail: {lastResult.channel}
                </span>

                <div className="bg-white p-3 rounded-xl border border-amber-200 inline-block w-full">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Kode Pembayaran Kasir</span>
                  <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-wider block my-1">
                    {lastResult.retail_code || lastResult.ref_no}
                  </span>
                  <button
                    onClick={() => copyToClipboard(lastResult.retail_code || lastResult.ref_no, 'retail_code')}
                    className="mt-1 text-xs font-bold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 px-3 py-1 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    {copiedField === 'retail_code' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin Kode Pembayaran</span>
                  </button>
                </div>

                <span className="text-xs text-slate-600 block">
                  Total Bayar di Kasir: <strong className="text-slate-900 font-mono">Rp {lastResult.amount.toLocaleString('id-ID')}</strong>
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 pb-1 border-b border-slate-200">
                    Cara Bayar di Kasir {lastResult.channel}:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                    <li>Kunjungi gerai {lastResult.channel} terdekat</li>
                    <li>Sampaikan ke kasir ingin melakukan pembayaran <strong>MustikaPay / Merchant</strong></li>
                    <li>Berikan Kode Pembayaran di samping kepada kasir</li>
                    <li>Bayar sejumlah <strong>Rp {lastResult.amount.toLocaleString('id-ID')}</strong></li>
                    <li>Simpan struk pembayaran sebagai bukti transaksi resmi</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer for Transaction Result */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
            >
              {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>{showRawJson ? 'Sembunyikan Raw JSON Response' : 'Lihat Raw JSON Response SDK'}</span>
            </button>

            <button
              onClick={() => onNavigateToStatus(lastResult.ref_no)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Periksa Status Transaksi Ini</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Raw JSON viewer */}
          {showRawJson && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-72">
              <pre>{JSON.stringify(lastResult.rawCreateResponse, null, 2)}</pre>
            </div>
          )}

          {/* Watermark NoxlyDev */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Tersimpan permanen di database SQLite (Node.js DatabaseSync)</span>
            <a
              href="https://www.noxlydev.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              <span>Integrated by NoxlyDev</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
