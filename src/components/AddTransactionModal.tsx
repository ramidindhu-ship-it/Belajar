import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Landmark,
  Receipt,
  Edit3,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  TransactionType,
  AccountCategory,
  TRANSACTION_TYPES,
  CATEGORY_DETAILS,
  TransactionRecord,
} from '../types/finance';
import { TransactionDatePicker } from './TransactionDatePicker';

interface AddTransactionModalProps {
  isOpen: boolean;
  transactionToEdit?: TransactionRecord | null;
  onClose: () => void;
}

const toDateInputString = (timestamp: number) => {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInputString = (timestamp: number) => {
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  transactionToEdit,
  onClose,
}) => {
  const { accountsWithBalances, addTransaction, updateTransaction } = useFinance();

  const isEditing = Boolean(transactionToEdit);

  const [selectedType, setSelectedType] = useState<TransactionType>('PENGELUARAN');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState<string>(() => toDateInputString(Date.now()));
  const [timeStr, setTimeStr] = useState<string>(() => toTimeInputString(Date.now()));

  // Source candidates
  const sourceCandidates = useMemo(() => {
    switch (selectedType) {
      case 'PENGELUARAN':
        return accountsWithBalances.filter(
          (a) => a.account.category === 'HARTA' || a.account.category === 'UTANG'
        );
      case 'PEMASUKAN':
        return accountsWithBalances.filter((a) => a.account.category === 'PENDAPATAN');
      case 'TRANSFER':
      case 'BAYAR_UTANG':
        return accountsWithBalances.filter((a) => a.account.category === 'HARTA');
      case 'TAMBAH_MODAL':
        return accountsWithBalances.filter((a) => a.account.category === 'MODAL');
    }
  }, [selectedType, accountsWithBalances]);

  // Destination candidates
  const destinationCandidates = useMemo(() => {
    switch (selectedType) {
      case 'PENGELUARAN':
        return accountsWithBalances.filter((a) => a.account.category === 'BIAYA');
      case 'PEMASUKAN':
      case 'TRANSFER':
      case 'TAMBAH_MODAL':
        return accountsWithBalances.filter((a) => a.account.category === 'HARTA');
      case 'BAYAR_UTANG':
        return accountsWithBalances.filter((a) => a.account.category === 'UTANG');
    }
  }, [selectedType, accountsWithBalances]);

  const [selectedSourceId, setSelectedSourceId] = useState<number>(() => sourceCandidates[0]?.account.id || 1);
  const [selectedDestId, setSelectedDestId] = useState<number>(() => destinationCandidates[0]?.account.id || 22);

  // When opening or changing transactionToEdit, initialize state
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setSelectedType(transactionToEdit.type);
        setAmountStr(String(transactionToEdit.amount));
        setDescription(transactionToEdit.description);
        setSelectedSourceId(transactionToEdit.fromAccountId);
        setSelectedDestId(transactionToEdit.toAccountId);
        setDateStr(toDateInputString(transactionToEdit.date));
        setTimeStr(toTimeInputString(transactionToEdit.date));
      } else {
        setSelectedType('PENGELUARAN');
        setAmountStr('');
        setDescription('');
        setDateStr(toDateInputString(Date.now()));
        setTimeStr(toTimeInputString(Date.now()));
        if (sourceCandidates[0]) setSelectedSourceId(sourceCandidates[0].account.id);
        if (destinationCandidates[0]) setSelectedDestId(destinationCandidates[0].account.id);
      }
    }
  }, [isOpen, transactionToEdit]);

  // Keep selection valid if user changes type
  useEffect(() => {
    if (sourceCandidates.length > 0 && !sourceCandidates.some((c) => c.account.id === selectedSourceId)) {
      setSelectedSourceId(sourceCandidates[0].account.id);
    }
    if (destinationCandidates.length > 0 && !destinationCandidates.some((c) => c.account.id === selectedDestId)) {
      setSelectedDestId(destinationCandidates[0].account.id);
    }
  }, [sourceCandidates, destinationCandidates, selectedSourceId, selectedDestId]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amountStr) || 0;
  const canSubmit = parsedAmount > 0 && selectedSourceId > 0 && selectedDestId > 0;

  const handleQuickAdd = (addVal: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr(String(current + addVal));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    let category: AccountCategory = 'BIAYA';
    if (selectedType === 'PEMASUKAN') category = 'PENDAPATAN';
    if (selectedType === 'TRANSFER') category = 'HARTA';
    if (selectedType === 'BAYAR_UTANG') category = 'UTANG';
    if (selectedType === 'TAMBAH_MODAL') category = 'MODAL';

    const destAccount = destinationCandidates.find((c) => c.account.id === selectedDestId);
    const finalDesc =
      description.trim() || `${TRANSACTION_TYPES[selectedType].title}: ${destAccount?.account.name || ''}`;

    // Parse chosen date and time to millis
    let finalTimestamp = Date.now();
    if (dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const [h, min] = (timeStr || '12:00').split(':').map(Number);
      const dateObj = new Date(y, m - 1, d, h || 0, min || 0);
      finalTimestamp = dateObj.getTime();
    }

    if (isEditing && transactionToEdit) {
      updateTransaction(transactionToEdit.id, {
        amount: parsedAmount,
        fromAccountId: selectedSourceId,
        toAccountId: selectedDestId,
        type: selectedType,
        category,
        description: finalDesc,
        date: finalTimestamp,
      });
    } else {
      addTransaction({
        amount: parsedAmount,
        fromAccountId: selectedSourceId,
        toAccountId: selectedDestId,
        type: selectedType,
        category,
        description: finalDesc,
        date: finalTimestamp,
      });
    }

    onClose();
  };

  const getSourceLabel = () => {
    switch (selectedType) {
      case 'PENGELUARAN':
        return 'Dibayar Dari (Harta / Utang):';
      case 'PEMASUKAN':
        return 'Kategori Pendapatan:';
      case 'TRANSFER':
        return 'Rekening Asal:';
      case 'BAYAR_UTANG':
        return 'Sumber Pembayaran:';
      case 'TAMBAH_MODAL':
        return 'Sumber Modal:';
    }
  };

  const getDestLabel = () => {
    switch (selectedType) {
      case 'PENGELUARAN':
        return 'Kategori Biaya / Pengeluaran:';
      case 'PEMASUKAN':
        return 'Masuk Ke (Rekening Harta):';
      case 'TRANSFER':
        return 'Rekening Tujuan:';
      case 'BAYAR_UTANG':
        return 'Utang Yang Dibayar:';
      case 'TAMBAH_MODAL':
        return 'Masuk Ke Kas / Rekening:';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {isEditing && (
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Edit3 className="w-5 h-5 stroke-[2.2]" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {isEditing ? 'Edit Transaksi Keuangan' : 'Catat Transaksi Keuangan'}
                </h3>
                {isEditing && transactionToEdit && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    {transactionToEdit.referenceNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? 'Koreksi kesalahan input nominal, akun atau tanggal transaksi'
                  : 'Jurnal keuangan harian terstruktur'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* 1. Transaction Type Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Tipe Transaksi
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(Object.keys(TRANSACTION_TYPES) as TransactionType[]).map((t) => {
                const isSelected = selectedType === t;
                const info = TRANSACTION_TYPES[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t === 'PENGELUARAN' && <ArrowDownRight className="w-3.5 h-3.5" />}
                    {t === 'PEMASUKAN' && <ArrowUpRight className="w-3.5 h-3.5" />}
                    {t === 'TRANSFER' && <ArrowLeftRight className="w-3.5 h-3.5" />}
                    {t === 'BAYAR_UTANG' && <Receipt className="w-3.5 h-3.5" />}
                    {t === 'TAMBAH_MODAL' && <Landmark className="w-3.5 h-3.5" />}
                    <span className="truncate">{info.title.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tanggal & Waktu Transaksi (MENU PILIH TANGGAL INTERAKTIF) */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Tanggal & Waktu Transaksi
            </label>
            <TransactionDatePicker
              dateStr={dateStr}
              timeStr={timeStr}
              onChangeDate={setDateStr}
              onChangeTime={setTimeStr}
            />
          </div>

          {/* 3. Amount Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Nominal Transaksi (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600 dark:text-emerald-400">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                autoFocus={!isEditing}
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {[
                { val: 10000, label: '+10rb' },
                { val: 50000, label: '+50rb' },
                { val: 100000, label: '+100rb' },
                { val: 500000, label: '+500rb' },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => handleQuickAdd(chip.val)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition shrink-0 cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Source Account Dropdown */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              {getSourceLabel()}
            </label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {sourceCandidates.map((c) => (
                <option key={c.account.id} value={c.account.id}>
                  {c.account.code} - {c.account.name} ({CATEGORY_DETAILS[c.account.category].displayName})
                </option>
              ))}
            </select>
          </div>

          {/* 5. Destination Account Dropdown */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              {getDestLabel()}
            </label>
            <select
              value={selectedDestId}
              onChange={(e) => setSelectedDestId(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {destinationCandidates.map((c) => (
                <option key={c.account.id} value={c.account.id}>
                  {c.account.code} - {c.account.name} ({CATEGORY_DETAILS[c.account.category].displayName})
                </option>
              ))}
            </select>
          </div>

          {/* 6. Note / Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Catatan / Keterangan Transaksi
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Makan siang dengan rekan kerja"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-3.5 rounded-2xl active:scale-[0.99] text-white font-extrabold text-sm transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                isEditing
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isEditing ? 'Simpan Perubahan Transaksi' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
