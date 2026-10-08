import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AccountCategory,
  AccountWithBalance,
  AppSettings,
  CategorySummary,
  CloudSyncState,
  DailyExpenseBarData,
  FinancialBalanceSheet,
  IncomeStatementReport,
  SubAccount,
  SyncLogEntry,
  ThemeMode,
  ColorPalette,
  DateFormatOption,
  TimeFormatOption,
  TransactionRecord,
  TransactionType,
  MonthlyClosingRecord,
  CATEGORY_DETAILS,
} from '../types/finance';
import { DEFAULT_SUB_ACCOUNTS, CHART_PALETTE } from '../data/defaultAccounts';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';

interface FinanceContextType {
  accounts: SubAccount[];
  transactions: TransactionRecord[];
  monthlyClosings: MonthlyClosingRecord[];
  accountsWithBalances: AccountWithBalance[];
  categorySummaries: Record<AccountCategory, CategorySummary>;
  balanceSheet: FinancialBalanceSheet;
  incomeStatement: IncomeStatementReport;
  dailyExpenses: DailyExpenseBarData[];
  cloudSyncState: CloudSyncState;
  cloudSyncLogs: SyncLogEntry[];
  appSettings: AppSettings;
  searchQuery: string;
  selectedCategoryFilter: AccountCategory | null;

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategoryFilter: (category: AccountCategory | null) => void;
  addTransaction: (data: {
    amount: number;
    fromAccountId: number;
    toAccountId: number;
    type: TransactionType;
    category: AccountCategory;
    description: string;
    date?: number;
  }) => void;
  updateTransaction: (
    id: number,
    data: {
      amount: number;
      fromAccountId: number;
      toAccountId: number;
      type: TransactionType;
      category: AccountCategory;
      description: string;
      date?: number;
    }
  ) => void;
  deleteTransaction: (id: number) => void;
  addSubAccount: (data: {
    category: AccountCategory;
    name: string;
    code: string;
    initialBalance?: number;
    iconName?: string;
  }) => void;
  deleteSubAccount: (id: number) => void;
  updateSubAccountInitialBalance: (accountId: number, initialBalance: number) => void;
  updateMultipleInitialBalances: (updates: Record<number, number>) => void;
  resetAllDataToCustomChartOfAccounts: () => void;
  clearAllTransactions: () => void;
  syncNow: () => Promise<boolean>;
  createCloudBackup: () => Promise<string>;
  restoreFromGoogleBackup: () => Promise<boolean>;
  toggleAutoSync: (enabled: boolean) => void;
  updateCloudEndpoint: (url: string) => void;

  // Monthly Closing Actions
  executeMonthlyClosing: (params: {
    year: number;
    month: number;
    retainedEarningsAccountId?: number;
    notes?: string;
  }) => Promise<{ success: boolean; message: string; record?: MonthlyClosingRecord }>;
  reopenMonthlyClosing: (closingId: string) => Promise<{ success: boolean; message: string }>;
  getMonthProfitAndLoss: (year: number, month: number) => {
    year: number;
    month: number;
    totalPendapatan: number;
    totalBiaya: number;
    netProfitOrLoss: number;
    transactionsCount: number;
    isClosed: boolean;
    closingRecord?: MonthlyClosingRecord;
  };

  // Settings Actions
  setThemeMode: (mode: ThemeMode) => void;
  setColorPalette: (palette: ColorPalette) => void;
  setDateFormat: (format: DateFormatOption) => void;
  setTimeFormat: (format: TimeFormatOption) => void;
  connectGoogleAccount: (email: string) => void;
  disconnectGoogleAccount: () => void;
  toggleRealtimeSync: (enabled: boolean) => void;

  // Formatting helpers
  formatRupiah: (amount: number) => string;
  formatDateTime: (millis: number) => string;
  formatDateOnly: (millis: number) => string;
  formatTimeOnly: (millis: number) => string;

  // Export
  exportExcelCsv: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'SYSTEM',
  colorPalette: 'EMERALD',
  dateFormat: 'DAY_MONTH_YEAR',
  timeFormat: 'HOUR_24',
  googleAccountEmail: '',
  isGoogleConnected: false,
  realtimeSyncEnabled: true,
  deviceId: 'Web-Client-7741',
  lastGoogleSyncTimestamp: Date.now() - 5 * 60 * 1000,
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const userStoragePrefix = useMemo(() => {
    return currentUser ? `bukukas_u_${currentUser.uid}` : 'bukukas_guest';
  }, [currentUser]);

  // 1. Accounts State
  const [accounts, setAccounts] = useState<SubAccount[]>(() => {
    try {
      const saved = localStorage.getItem(`${userStoragePrefix}_accounts`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_SUB_ACCOUNTS;
  });

  // 2. Transactions State
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${userStoragePrefix}_transactions`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });

  // 3. Monthly Closings State
  const [monthlyClosings, setMonthlyClosings] = useState<MonthlyClosingRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${userStoragePrefix}_monthly_closings`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });

  // 4. Settings State
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(`${userStoragePrefix}_settings`);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  // 5. Cloud Sync State
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>({
    isSyncing: false,
    lastSyncTimestamp: Date.now() - 15 * 60 * 1000,
    pendingSyncCount: 0,
    syncSuccess: true,
    statusMessage: 'Tersinkronisasi dengan Cloud Storage',
    cloudEndpoint: 'https://cloud.bukukas-pro.app/api/v1/sync',
    autoSyncEnabled: true,
  });

  // 6. Cloud Sync Logs
  const [cloudSyncLogs, setCloudSyncLogs] = useState<SyncLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`${userStoragePrefix}_synclogs`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        timestamp: Date.now() - 5 * 60 * 1000,
        itemsCount: 0,
        isSuccess: true,
        message: 'Bagan akun resmi (37 subakun) siap disinkronkan ke cloud',
      },
    ];
  });

  // 7. UI Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<AccountCategory | null>(null);

  // Switch storage & fetch Firestore data whenever user logs in or out
  useEffect(() => {
    // 1. Load local cache for this specific user
    try {
      const savedAccounts = localStorage.getItem(`${userStoragePrefix}_accounts`);
      if (savedAccounts) {
        const parsed = JSON.parse(savedAccounts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed);
        } else {
          setAccounts(DEFAULT_SUB_ACCOUNTS);
        }
      } else {
        setAccounts(DEFAULT_SUB_ACCOUNTS);
      }

      const savedTx = localStorage.getItem(`${userStoragePrefix}_transactions`);
      if (savedTx) {
        setTransactions(JSON.parse(savedTx));
      } else {
        setTransactions([]);
      }

      const savedClosings = localStorage.getItem(`${userStoragePrefix}_monthly_closings`);
      if (savedClosings) {
        setMonthlyClosings(JSON.parse(savedClosings));
      } else {
        setMonthlyClosings([]);
      }

      const savedSettings = localStorage.getItem(`${userStoragePrefix}_settings`);
      if (savedSettings) {
        setAppSettings({
          ...DEFAULT_SETTINGS,
          ...JSON.parse(savedSettings),
          googleAccountEmail: currentUser?.email || '',
          isGoogleConnected: Boolean(currentUser),
        });
      } else {
        setAppSettings((prev) => ({
          ...prev,
          googleAccountEmail: currentUser?.email || '',
          isGoogleConnected: Boolean(currentUser),
        }));
      }
    } catch (e) {
      console.error('Error switching user storage:', e);
    }

    // 2. If logged in with Google, fetch accounts & settings from latest backup
    if (currentUser) {
      const fetchCloudBackup = async () => {
        try {
          const backupDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
          const snap = await getDoc(backupDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.dataJson) {
              const parsedSnapshot = JSON.parse(data.dataJson);
              if (parsedSnapshot.accounts && Array.isArray(parsedSnapshot.accounts) && parsedSnapshot.accounts.length > 0) {
                setAccounts(parsedSnapshot.accounts);
              }
              if (parsedSnapshot.monthlyClosings && Array.isArray(parsedSnapshot.monthlyClosings)) {
                setMonthlyClosings(parsedSnapshot.monthlyClosings);
              }
              if (parsedSnapshot.appSettings) {
                setAppSettings((prev) => ({
                  ...prev,
                  ...parsedSnapshot.appSettings,
                  googleAccountEmail: currentUser.email || '',
                  isGoogleConnected: true,
                }));
              }
            }
          }
        } catch (err) {
          console.error('Error fetching latest cloud backup from Firestore:', err);
        }
      };

      fetchCloudBackup();
    }
  }, [userStoragePrefix, currentUser]);

  // 3. Real-time Firestore synchronization for Transactions
  useEffect(() => {
    if (!currentUser) return;

    const txCollectionRef = collection(db, 'users', currentUser.uid, 'transactions');
    let hasProcessedInitial = false;

    const unsubscribe = onSnapshot(
      txCollectionRef,
      async (snapshot) => {
        if (!snapshot.empty) {
          const remoteTxs: TransactionRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteTxs.push({
              id: Number(docSnap.id),
              date: data.date,
              amount: data.amount,
              fromAccountId: data.fromAccountId,
              toAccountId: data.toAccountId,
              type: data.type,
              category: data.category,
              description: data.description || '',
              referenceNumber: data.referenceNumber || `TRX-${docSnap.id}`,
              isSynced: true,
              updatedAt: data.updatedAt || Date.now(),
            });
          });

          remoteTxs.sort((a, b) => b.date - a.date);
          setTransactions(remoteTxs);
          localStorage.setItem(`${userStoragePrefix}_transactions`, JSON.stringify(remoteTxs));

          const timeStr = new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(new Date());

          setCloudSyncState((prev) => ({
            ...prev,
            lastSyncTimestamp: Date.now(),
            statusMessage: `Tersinkronisasi Realtime (${timeStr})`,
            syncSuccess: true,
          }));
        } else if (!hasProcessedInitial) {
          // If transactions subcollection is empty on initial fetch, check if there is legacy backup or local cache to seed
          try {
            const latestDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
            const snap = await getDoc(latestDocRef);
            let txsToMigrate: TransactionRecord[] = [];

            if (snap.exists() && snap.data()?.dataJson) {
              const parsed = JSON.parse(snap.data().dataJson);
              if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
                txsToMigrate = parsed.transactions;
              }
            }

            if (txsToMigrate.length === 0) {
              const localSaved = localStorage.getItem(`${userStoragePrefix}_transactions`);
              if (localSaved) {
                const parsedLocal = JSON.parse(localSaved);
                if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
                  txsToMigrate = parsedLocal;
                }
              }
            }

            if (txsToMigrate.length > 0) {
              for (const tx of txsToMigrate) {
                await setDoc(doc(db, 'users', currentUser.uid, 'transactions', String(tx.id)), {
                  id: tx.id,
                  userId: currentUser.uid,
                  date: tx.date,
                  amount: tx.amount,
                  fromAccountId: tx.fromAccountId,
                  toAccountId: tx.toAccountId,
                  type: tx.type,
                  category: tx.category,
                  description: tx.description,
                  referenceNumber: tx.referenceNumber,
                  updatedAt: tx.updatedAt || Date.now(),
                });
              }
            }
          } catch (err) {
            console.error('Error during initial sync migration:', err);
          }
        } else {
          // Subcollection is empty after user deleted all transactions
          setTransactions([]);
          localStorage.setItem(`${userStoragePrefix}_transactions`, JSON.stringify([]));
        }

        hasProcessedInitial = true;
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/transactions`);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser, userStoragePrefix]);

  // 4. Real-time Firestore synchronization for Monthly Closings
  useEffect(() => {
    if (!currentUser) return;

    const closingsRef = collection(db, 'users', currentUser.uid, 'monthly_closings');
    const unsubscribe = onSnapshot(
      closingsRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteClosings: MonthlyClosingRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteClosings.push({
              id: docSnap.id,
              year: data.year,
              month: data.month,
              monthLabel: data.monthLabel,
              closedAt: data.closedAt,
              totalPendapatan: data.totalPendapatan,
              totalBiaya: data.totalBiaya,
              netProfitOrLoss: data.netProfitOrLoss,
              retainedEarningsAccountId: data.retainedEarningsAccountId,
              retainedEarningsAccountName: data.retainedEarningsAccountName,
              closingTransactionIds: data.closingTransactionIds || [],
              notes: data.notes || '',
            });
          });

          remoteClosings.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });

          setMonthlyClosings(remoteClosings);
          localStorage.setItem(`${userStoragePrefix}_monthly_closings`, JSON.stringify(remoteClosings));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/monthly_closings`);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser, userStoragePrefix]);

  // Persist to user-specific localStorage
  useEffect(() => {
    localStorage.setItem(`${userStoragePrefix}_accounts`, JSON.stringify(accounts));
  }, [accounts, userStoragePrefix]);

  useEffect(() => {
    localStorage.setItem(`${userStoragePrefix}_transactions`, JSON.stringify(transactions));
  }, [transactions, userStoragePrefix]);

  useEffect(() => {
    localStorage.setItem(`${userStoragePrefix}_monthly_closings`, JSON.stringify(monthlyClosings));
  }, [monthlyClosings, userStoragePrefix]);

  useEffect(() => {
    localStorage.setItem(`${userStoragePrefix}_settings`, JSON.stringify(appSettings));
  }, [appSettings, userStoragePrefix]);

  useEffect(() => {
    localStorage.setItem(`${userStoragePrefix}_synclogs`, JSON.stringify(cloudSyncLogs));
  }, [cloudSyncLogs, userStoragePrefix]);

  // Handle Theme & Dark Mode
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      appSettings.themeMode === 'DARK' ||
      (appSettings.themeMode === 'SYSTEM' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.setAttribute('data-palette', appSettings.colorPalette.toLowerCase());
  }, [appSettings.themeMode, appSettings.colorPalette]);

  // Computing Account Balances
  const accountsWithBalances = useMemo<AccountWithBalance[]>(() => {
    return accounts.map((account) => {
      let balance = account.initialBalance || 0;
      let txCount = 0;
      const isDebitNormal = CATEGORY_DETAILS[account.category].isDebitNormal;

      // Add net profit or loss from completed monthly closings allocated to this retained earnings / equity account
      for (const closing of monthlyClosings) {
        if (closing.retainedEarningsAccountId === account.id) {
          // MODAL category is credit normal: profit (+ net profit) increases equity, loss decreases it
          balance += closing.netProfitOrLoss;
        }
      }

      for (const tx of transactions) {
        const isDebit = tx.toAccountId === account.id;
        const isCredit = tx.fromAccountId === account.id;

        if (isDebit || isCredit) {
          txCount++;
          if (isDebitNormal) {
            if (isDebit) balance += tx.amount;
            if (isCredit) balance -= tx.amount;
          } else {
            if (isCredit) balance += tx.amount;
            if (isDebit) balance -= tx.amount;
          }
        }
      }

      return {
        account,
        balance,
        transactionCount: txCount,
      };
    });
  }, [accounts, transactions, monthlyClosings]);

  // Category Summaries
  const categorySummaries = useMemo<Record<AccountCategory, CategorySummary>>(() => {
    const categories: AccountCategory[] = ['HARTA', 'UTANG', 'MODAL', 'PENDAPATAN', 'BIAYA'];
    const result = {} as Record<AccountCategory, CategorySummary>;

    for (const cat of categories) {
      const catAccounts = accountsWithBalances.filter((a) => a.account.category === cat);
      const totalBalance = catAccounts.reduce((sum, item) => sum + item.balance, 0);
      result[cat] = {
        category: cat,
        totalBalance,
        accounts: catAccounts,
      };
    }

    return result;
  }, [accountsWithBalances]);

  // Balance Sheet (Neraca Keuangan)
  const balanceSheet = useMemo<FinancialBalanceSheet>(() => {
    const totalHarta = categorySummaries.HARTA?.totalBalance || 0;
    const totalUtang = categorySummaries.UTANG?.totalBalance || 0;
    const totalModal = categorySummaries.MODAL?.totalBalance || 0;
    const totalPendapatan = categorySummaries.PENDAPATAN?.totalBalance || 0;
    const totalBiaya = categorySummaries.BIAYA?.totalBalance || 0;

    // Total net profit across all time from income & expense accounts
    const totalAllTimeNetProfit = totalPendapatan - totalBiaya;

    // Sum of net profit/loss already closed into MODAL (Laba Ditahan)
    const totalClosedNetProfit = monthlyClosings.reduce((sum, c) => sum + c.netProfitOrLoss, 0);

    // Current unclosed period net profit
    const currentPeriodNetProfit = totalAllTimeNetProfit - totalClosedNetProfit;

    const totalPasiva = totalUtang + totalModal + currentPeriodNetProfit;
    const isBalanced = Math.abs(totalHarta - totalPasiva) < 1.0;

    return {
      totalHarta,
      totalUtang,
      totalModal,
      currentPeriodNetProfit,
      totalPasiva,
      isBalanced,
    };
  }, [categorySummaries, monthlyClosings]);

  // Income Statement (Laba Rugi)
  const incomeStatement = useMemo<IncomeStatementReport>(() => {
    const revenueAccounts = accountsWithBalances.filter(
      (a) => a.account.category === 'PENDAPATAN' && a.balance > 0
    );
    const expenseAccounts = accountsWithBalances.filter(
      (a) => a.account.category === 'BIAYA' && a.balance > 0
    );

    const totalPendapatan = revenueAccounts.reduce((sum, item) => sum + item.balance, 0);
    const totalBiaya = expenseAccounts.reduce((sum, item) => sum + item.balance, 0);
    const netProfitOrLoss = totalPendapatan - totalBiaya;

    const revenueBreakdown = revenueAccounts.map((item, idx) => ({
      subAccountId: item.account.id,
      subAccountName: item.account.name,
      category: item.account.category,
      totalAmount: item.balance,
      percentage: totalPendapatan > 0 ? (item.balance / totalPendapatan) * 100 : 0,
      color: CHART_PALETTE[idx % CHART_PALETTE.length],
      transactionCount: item.transactionCount,
    }));

    const expenseBreakdown = expenseAccounts.map((item, idx) => ({
      subAccountId: item.account.id,
      subAccountName: item.account.name,
      category: item.account.category,
      totalAmount: item.balance,
      percentage: totalBiaya > 0 ? (item.balance / totalBiaya) * 100 : 0,
      color: CHART_PALETTE[idx % CHART_PALETTE.length],
      transactionCount: item.transactionCount,
    }));

    return {
      totalPendapatan,
      totalBiaya,
      netProfitOrLoss,
      revenueBreakdown,
      expenseBreakdown,
    };
  }, [accountsWithBalances]);

  // Daily Expenses for Last 7 Days
  const dailyExpenses = useMemo<DailyExpenseBarData[]>(() => {
    const dayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });
    const fullFormatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' });
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const result: DailyExpenseBarData[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const startMillis = d.getTime();
      const endMillis = startMillis + 86400000 - 1;

      const dayTotal = transactions
        .filter((tx) => tx.category === 'BIAYA' && tx.date >= startMillis && tx.date <= endMillis)
        .reduce((sum, tx) => sum + tx.amount, 0);

      result.push({
        dayLabel: dayFormatter.format(d),
        fullDate: fullFormatter.format(d),
        amount: dayTotal,
        isToday: startMillis === todayStart,
      });
    }

    return result;
  }, [transactions]);

  // Create Cloud Backup directly to Firestore for the authenticated Google user
  const createCloudBackup = useCallback(
    async (overrideTransactions?: TransactionRecord[]): Promise<string> => {
      setCloudSyncState((prev) => ({
        ...prev,
        isSyncing: true,
        statusMessage: 'Membuat cadangan terenkripsi ke Akun Google...',
      }));

      const now = Date.now();
      const backupId = `BACKUP-GACCOUNT-${now}`;
      const targetTransactions = overrideTransactions !== undefined ? overrideTransactions : transactions;

      const snapshotPayload = {
        backupId,
        userId: currentUser?.uid || 'guest',
        email: currentUser?.email || 'local_user',
        timestamp: now,
        accountsCount: accounts.length,
        transactionsCount: targetTransactions.length,
        totalHarta: balanceSheet.totalHarta,
        totalUtang: balanceSheet.totalUtang,
        netWorth: balanceSheet.totalHarta - balanceSheet.totalUtang,
        dataJson: JSON.stringify({
          accounts,
          transactions: targetTransactions,
          monthlyClosings,
          appSettings,
        }),
      };

      if (currentUser) {
        try {
          const latestDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
          const historyDocRef = doc(db, 'users', currentUser.uid, 'backups', backupId);

          await setDoc(latestDocRef, snapshotPayload);
          await setDoc(historyDocRef, snapshotPayload);

          // Synchronize transactions subcollection: purge remote docs that no longer exist
          const snap = await getDocs(collection(db, 'users', currentUser.uid, 'transactions'));
          const activeIds = new Set(targetTransactions.map((t) => String(t.id)));

          for (const remoteDoc of snap.docs) {
            if (!activeIds.has(remoteDoc.id)) {
              await deleteDoc(remoteDoc.ref);
            }
          }

          // Ensure active transactions exist in subcollection
          for (const tx of targetTransactions) {
            await setDoc(doc(db, 'users', currentUser.uid, 'transactions', String(tx.id)), {
              id: tx.id,
              userId: currentUser.uid,
              date: tx.date,
              amount: tx.amount,
              fromAccountId: tx.fromAccountId,
              toAccountId: tx.toAccountId,
              type: tx.type,
              category: tx.category,
              description: tx.description,
              referenceNumber: tx.referenceNumber,
              updatedAt: tx.updatedAt || Date.now(),
            });
          }

          // Synchronize monthly_closings subcollection
          const closingSnap = await getDocs(collection(db, 'users', currentUser.uid, 'monthly_closings'));
          const activeClosingIds = new Set(monthlyClosings.map((c) => c.id));

          for (const remoteDoc of closingSnap.docs) {
            if (!activeClosingIds.has(remoteDoc.id)) {
              await deleteDoc(remoteDoc.ref);
            }
          }

          for (const c of monthlyClosings) {
            await setDoc(doc(db, 'users', currentUser.uid, 'monthly_closings', c.id), {
              ...c,
              userId: currentUser.uid,
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/backups/latest`);
        }
      }

      setCloudSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTimestamp: now,
        syncSuccess: true,
        statusMessage: currentUser
          ? `Tercadangkan di Akun Google (${currentUser.email})`
          : 'Tercadangkan di penyimpanan lokal',
      }));

      setCloudSyncLogs((prev) => [
        {
          timestamp: now,
          itemsCount: targetTransactions.length,
          isSuccess: true,
          message: currentUser
            ? `Cadangan cloud sukses disimpan ke akun Google ${currentUser.email}`
            : `Cadangan snapshot berhasil disimpan (${backupId})`,
        },
        ...prev.slice(0, 19),
      ]);

      setAppSettings((prev) => ({
        ...prev,
        lastGoogleSyncTimestamp: now,
      }));

      return backupId;
    },
    [currentUser, accounts, transactions, monthlyClosings, appSettings, balanceSheet]
  );

  // Restore from latest Google backup
  const restoreFromGoogleBackup = useCallback(async (): Promise<boolean> => {
    if (!currentUser) return false;

    setCloudSyncState((prev) => ({
      ...prev,
      isSyncing: true,
      statusMessage: 'Memulihkan data dari Akun Google...',
    }));

    try {
      const backupDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
      const snap = await getDoc(backupDocRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.dataJson) {
          const parsed = JSON.parse(data.dataJson);
          if (Array.isArray(parsed.accounts)) setAccounts(parsed.accounts);
          if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
          if (Array.isArray(parsed.monthlyClosings)) setMonthlyClosings(parsed.monthlyClosings);
          if (parsed.appSettings) setAppSettings(parsed.appSettings);
        }

        const now = Date.now();
        setCloudSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncTimestamp: now,
          syncSuccess: true,
          statusMessage: 'Data berhasil dipulihkan dari Akun Google',
        }));

        setCloudSyncLogs((prev) => [
          {
            timestamp: now,
            itemsCount: (snap.data().transactionsCount || 0),
            isSuccess: true,
            message: `Data berhasil dipulihkan dari cadangan Akun Google (${currentUser.email})`,
          },
          ...prev.slice(0, 19),
        ]);
        return true;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/backups/latest`);
    }

    setCloudSyncState((prev) => ({
      ...prev,
      isSyncing: false,
      syncSuccess: false,
      statusMessage: 'Belum ada cadangan ditemukan di akun Google ini',
    }));
    return false;
  }, [currentUser]);

  // Sync action (Firestore + state)
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (cloudSyncState.isSyncing) return false;

    setCloudSyncState((prev) => ({
      ...prev,
      isSyncing: true,
      statusMessage: currentUser
        ? `Menghubungkan ke Google Cloud (${currentUser.email})...`
        : 'Menghubungkan ke server cloud...',
    }));

    if (currentUser) {
      await createCloudBackup();
    } else {
      await new Promise((r) => setTimeout(r, 600));
    }

    const now = Date.now();
    const timeString = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(now));

    // Mark transactions as synced
    setTransactions((prev) => prev.map((t) => ({ ...t, isSynced: true })));

    setCloudSyncState((prev) => ({
      ...prev,
      isSyncing: false,
      lastSyncTimestamp: now,
      pendingSyncCount: 0,
      syncSuccess: true,
      statusMessage: currentUser
        ? `Tersinkronisasi aman dengan ${currentUser.email} (${timeString})`
        : `Tersinkronisasi aman (${timeString})`,
    }));

    return true;
  }, [cloudSyncState.isSyncing, currentUser, createCloudBackup]);

  // Add Transaction
  const addTransaction = useCallback(
    async (data: {
      amount: number;
      fromAccountId: number;
      toAccountId: number;
      type: TransactionType;
      category: AccountCategory;
      description: string;
      date?: number;
    }) => {
      const nextId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 1;
      const refNumber = `TRX-${String(nextId).padStart(4, '0')}`;

      const newTx: TransactionRecord = {
        id: nextId,
        date: data.date || Date.now(),
        amount: data.amount,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        type: data.type,
        category: data.category,
        description: data.description,
        referenceNumber: refNumber,
        isSynced: Boolean(currentUser),
        updatedAt: Date.now(),
      };

      setTransactions((prev) => {
        const updated = [newTx, ...prev.filter((t) => t.id !== nextId)].sort((a, b) => b.date - a.date);
        localStorage.setItem(`${userStoragePrefix}_transactions`, JSON.stringify(updated));
        return updated;
      });

      if (currentUser) {
        const txDocPath = `users/${currentUser.uid}/transactions/${newTx.id}`;
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'transactions', String(newTx.id)), {
            id: newTx.id,
            userId: currentUser.uid,
            date: newTx.date,
            amount: newTx.amount,
            fromAccountId: newTx.fromAccountId,
            toAccountId: newTx.toAccountId,
            type: newTx.type,
            category: newTx.category,
            description: newTx.description,
            referenceNumber: newTx.referenceNumber,
            updatedAt: newTx.updatedAt,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, txDocPath);
        }

        try {
          const latestDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
          const snap = await getDoc(latestDocRef);
          if (snap.exists() && snap.data()?.dataJson) {
            const parsed = JSON.parse(snap.data().dataJson);
            if (Array.isArray(parsed.transactions)) {
              parsed.transactions = [newTx, ...parsed.transactions.filter((t: TransactionRecord) => t.id !== newTx.id)].sort(
                (a: TransactionRecord, b: TransactionRecord) => b.date - a.date
              );
              await setDoc(latestDocRef, {
                ...snap.data(),
                transactionsCount: parsed.transactions.length,
                timestamp: Date.now(),
                dataJson: JSON.stringify(parsed),
              });
            }
          }
        } catch (e) {
          console.warn('Backup update on add notice:', e);
        }
      }
    },
    [transactions, currentUser, userStoragePrefix]
  );

  // Update Transaction
  const updateTransaction = useCallback(
    async (
      id: number,
      data: {
        amount: number;
        fromAccountId: number;
        toAccountId: number;
        type: TransactionType;
        category: AccountCategory;
        description: string;
        date?: number;
      }
    ) => {
      let updatedTx: TransactionRecord | null = null;
      setTransactions((prev) => {
        const updated = prev
          .map((t) => {
            if (t.id === id) {
              updatedTx = {
                ...t,
                amount: data.amount,
                fromAccountId: data.fromAccountId,
                toAccountId: data.toAccountId,
                type: data.type,
                category: data.category,
                description: data.description,
                date: data.date !== undefined ? data.date : t.date,
                isSynced: Boolean(currentUser),
                updatedAt: Date.now(),
              };
              return updatedTx;
            }
            return t;
          })
          .sort((a, b) => b.date - a.date);
        localStorage.setItem(`${userStoragePrefix}_transactions`, JSON.stringify(updated));
        return updated;
      });

      if (currentUser && updatedTx) {
        const txDocPath = `users/${currentUser.uid}/transactions/${id}`;
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'transactions', String(id)), {
            id,
            userId: currentUser.uid,
            date: (updatedTx as TransactionRecord).date,
            amount: (updatedTx as TransactionRecord).amount,
            fromAccountId: (updatedTx as TransactionRecord).fromAccountId,
            toAccountId: (updatedTx as TransactionRecord).toAccountId,
            type: (updatedTx as TransactionRecord).type,
            category: (updatedTx as TransactionRecord).category,
            description: (updatedTx as TransactionRecord).description,
            referenceNumber: (updatedTx as TransactionRecord).referenceNumber,
            updatedAt: (updatedTx as TransactionRecord).updatedAt,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, txDocPath);
        }

        try {
          const latestDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
          const snap = await getDoc(latestDocRef);
          if (snap.exists() && snap.data()?.dataJson) {
            const parsed = JSON.parse(snap.data().dataJson);
            if (Array.isArray(parsed.transactions)) {
              parsed.transactions = parsed.transactions.map((t: TransactionRecord) => (t.id === id ? updatedTx : t));
              await setDoc(latestDocRef, {
                ...snap.data(),
                timestamp: Date.now(),
                dataJson: JSON.stringify(parsed),
              });
            }
          }
        } catch (e) {
          console.warn('Backup update on edit notice:', e);
        }
      }
    },
    [currentUser, userStoragePrefix]
  );

  // Delete Transaction with real-time cloud synchronization
  const deleteTransaction = useCallback(
    async (id: number) => {
      // 1. Instantly remove from local state & localStorage for instantaneous UX
      setTransactions((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        localStorage.setItem(`${userStoragePrefix}_transactions`, JSON.stringify(updated));
        return updated;
      });

      // 2. Real-time deletion in Firestore if authenticated
      if (currentUser) {
        const txDocPath = `users/${currentUser.uid}/transactions/${id}`;
        try {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', String(id)));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, txDocPath);
        }

        // 3. Update backups/latest in Firestore so backup NEVER restores this deleted transaction
        try {
          const latestDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
          const snap = await getDoc(latestDocRef);
          if (snap.exists() && snap.data()?.dataJson) {
            const parsed = JSON.parse(snap.data().dataJson);
            if (Array.isArray(parsed.transactions)) {
              parsed.transactions = parsed.transactions.filter((t: TransactionRecord) => t.id !== id);
              await setDoc(latestDocRef, {
                ...snap.data(),
                transactionsCount: parsed.transactions.length,
                timestamp: Date.now(),
                dataJson: JSON.stringify(parsed),
              });
            }
          }
        } catch (backupErr) {
          console.warn('Notice updating cloud backup on delete:', backupErr);
        }

        const now = Date.now();
        setCloudSyncState((prev) => ({
          ...prev,
          lastSyncTimestamp: now,
          syncSuccess: true,
          statusMessage: `Transaksi #TRX-${String(id).padStart(4, '0')} terhapus dari cloud realtime`,
        }));

        setCloudSyncLogs((prev) => [
          {
            timestamp: now,
            itemsCount: 1,
            isSuccess: true,
            message: `Transaksi #TRX-${String(id).padStart(4, '0')} berhasil dihapus dari cloud realtime`,
          },
          ...prev.slice(0, 19),
        ]);
      }
    },
    [currentUser, userStoragePrefix]
  );

  // Add SubAccount
  const addSubAccount = useCallback(
    (data: {
      category: AccountCategory;
      name: string;
      code: string;
      initialBalance?: number;
      iconName?: string;
    }) => {
      const nextId = accounts.length > 0 ? Math.max(...accounts.map((a) => a.id)) + 1 : 1;
      const newAccount: SubAccount = {
        id: nextId,
        category: data.category,
        name: data.name,
        code: data.code,
        initialBalance: data.initialBalance || 0,
        iconName: data.iconName || 'account_balance',
        isDefault: false,
        updatedAt: Date.now(),
      };
      setAccounts((prev) => [...prev, newAccount]);
    },
    [accounts]
  );

  // Delete SubAccount
  const deleteSubAccount = useCallback((id: number) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Update initial balance for single account
  const updateSubAccountInitialBalance = useCallback((accountId: number, initialBalance: number) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, initialBalance, updatedAt: Date.now() } : acc))
    );
  }, []);

  // Update multiple initial balances
  const updateMultipleInitialBalances = useCallback((updates: Record<number, number>) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (updates[acc.id] !== undefined) {
          return { ...acc, initialBalance: updates[acc.id], updatedAt: Date.now() };
        }
        return acc;
      })
    );
  }, []);

  // Reset all data
  const resetAllDataToCustomChartOfAccounts = useCallback(async () => {
    setTransactions([]);
    setAccounts(DEFAULT_SUB_ACCOUNTS);
    localStorage.setItem(`${userStoragePrefix}_transactions`, JSON.stringify([]));
    localStorage.setItem(`${userStoragePrefix}_accounts`, JSON.stringify(DEFAULT_SUB_ACCOUNTS));

    if (currentUser) {
      try {
        const snap = await getDocs(collection(db, 'users', currentUser.uid, 'transactions'));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      } catch (err) {
        console.warn('Error clearing transactions collection on reset:', err);
      }

      try {
        const latestDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
        await setDoc(latestDocRef, {
          backupId: `RESET-${Date.now()}`,
          userId: currentUser.uid,
          email: currentUser.email,
          timestamp: Date.now(),
          accountsCount: DEFAULT_SUB_ACCOUNTS.length,
          transactionsCount: 0,
          totalHarta: 0,
          totalUtang: 0,
          netWorth: 0,
          dataJson: JSON.stringify({
            accounts: DEFAULT_SUB_ACCOUNTS,
            transactions: [],
            appSettings,
          }),
        });
      } catch (e) {
        console.warn('Error resetting backup latest:', e);
      }
    }

    setCloudSyncLogs([
      {
        timestamp: Date.now(),
        itemsCount: 0,
        isSuccess: true,
        message: 'Data berhasil direset ke bagan akun resmi (37 subakun). Semua transaksi dikosongkan dari lokal & cloud.',
      },
    ]);
  }, [currentUser, userStoragePrefix, appSettings]);

  const clearAllTransactions = useCallback(async () => {
    setTransactions([]);
    localStorage.setItem(`${userStoragePrefix}_transactions`, JSON.stringify([]));

    if (currentUser) {
      try {
        const snap = await getDocs(collection(db, 'users', currentUser.uid, 'transactions'));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      } catch (err) {
        console.warn('Error clearing transactions collection:', err);
      }

      try {
        const latestDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
        const snap = await getDoc(latestDocRef);
        if (snap.exists() && snap.data()?.dataJson) {
          const parsed = JSON.parse(snap.data().dataJson);
          parsed.transactions = [];
          await setDoc(latestDocRef, {
            ...snap.data(),
            transactionsCount: 0,
            timestamp: Date.now(),
            dataJson: JSON.stringify(parsed),
          });
        }
      } catch (e) {
        console.warn('Error updating backup on clear transactions:', e);
      }
    }
  }, [currentUser, userStoragePrefix]);

  // Monthly Closing Helpers & Actions
  const getMonthProfitAndLoss = useCallback(
    (year: number, month: number) => {
      const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime();
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).getTime();

      const monthTxs = transactions.filter((tx) => tx.date >= startOfMonth && tx.date <= endOfMonth);

      let totalPendapatan = 0;
      let totalBiaya = 0;

      for (const tx of monthTxs) {
        if (tx.type === 'PEMASUKAN' || tx.category === 'PENDAPATAN') {
          totalPendapatan += tx.amount;
        } else if (tx.type === 'PENGELUARAN' || tx.category === 'BIAYA') {
          totalBiaya += tx.amount;
        }
      }

      const netProfitOrLoss = totalPendapatan - totalBiaya;
      const closingId = `CLOSING-${year}-${String(month).padStart(2, '0')}`;
      const closingRecord = monthlyClosings.find((c) => c.id === closingId);

      return {
        year,
        month,
        totalPendapatan,
        totalBiaya,
        netProfitOrLoss,
        transactionsCount: monthTxs.length,
        isClosed: Boolean(closingRecord),
        closingRecord,
      };
    },
    [transactions, monthlyClosings]
  );

  const executeMonthlyClosing = useCallback(
    async (params: {
      year: number;
      month: number;
      retainedEarningsAccountId?: number;
      notes?: string;
    }): Promise<{ success: boolean; message: string; record?: MonthlyClosingRecord }> => {
      const { year, month } = params;
      const closingId = `CLOSING-${year}-${String(month).padStart(2, '0')}`;

      // Check if already closed
      if (monthlyClosings.some((c) => c.id === closingId)) {
        return {
          success: false,
          message: `Periode ${month}/${year} sudah pernah ditutup buku sebelumnya.`,
        };
      }

      // Default retained earnings account is ID 21 ('Laba Ditahan') or find account with code '3.2.1' or first MODAL
      let targetAccId = params.retainedEarningsAccountId;
      if (!targetAccId) {
        const retainedAcc =
          accounts.find((a) => a.id === 21) ||
          accounts.find((a) => a.code === '3.2.1') ||
          accounts.find((a) => a.category === 'MODAL' && a.name.toLowerCase().includes('laba ditahan')) ||
          accounts.find((a) => a.category === 'MODAL');
        targetAccId = retainedAcc?.id || 21;
      }

      const targetAccount = accounts.find((a) => a.id === targetAccId);
      const targetAccountName = targetAccount ? `[${targetAccount.code}] ${targetAccount.name}` : 'Laba Ditahan';

      const pl = getMonthProfitAndLoss(year, month);

      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const monthLabel = `${monthNames[month - 1]} ${year}`;

      const newClosing: MonthlyClosingRecord = {
        id: closingId,
        year,
        month,
        monthLabel,
        closedAt: Date.now(),
        totalPendapatan: pl.totalPendapatan,
        totalBiaya: pl.totalBiaya,
        netProfitOrLoss: pl.netProfitOrLoss,
        retainedEarningsAccountId: targetAccId,
        retainedEarningsAccountName: targetAccountName,
        closingTransactionIds: [],
        notes:
          params.notes ||
          `Tutup buku periode ${monthLabel}. Laba bersih ${pl.netProfitOrLoss >= 0 ? 'Surplus' : 'Defisit'} dialokasikan ke ${targetAccountName}.`,
      };

      const updatedClosings = [...monthlyClosings, newClosing].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      setMonthlyClosings(updatedClosings);
      localStorage.setItem(`${userStoragePrefix}_monthly_closings`, JSON.stringify(updatedClosings));

      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'monthly_closings', newClosing.id), {
            ...newClosing,
            userId: currentUser.uid,
          });

          const latestDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
          const snap = await getDoc(latestDocRef);
          if (snap.exists() && snap.data()?.dataJson) {
            const parsed = JSON.parse(snap.data().dataJson);
            parsed.monthlyClosings = updatedClosings;
            await setDoc(
              latestDocRef,
              {
                dataJson: JSON.stringify(parsed),
                timestamp: Date.now(),
              },
              { merge: true }
            );
          }
        } catch (e) {
          console.error('Error saving monthly closing to cloud:', e);
        }
      }

      return {
        success: true,
        message: `Tutup buku periode ${monthLabel} berhasil! Laba/rugi telah dialokasikan ke akun ${targetAccountName}.`,
        record: newClosing,
      };
    },
    [monthlyClosings, accounts, getMonthProfitAndLoss, userStoragePrefix, currentUser]
  );

  const reopenMonthlyClosing = useCallback(
    async (closingId: string): Promise<{ success: boolean; message: string }> => {
      const existing = monthlyClosings.find((c) => c.id === closingId);
      if (!existing) {
        return { success: false, message: 'Data tutup buku tidak ditemukan.' };
      }

      const updated = monthlyClosings.filter((c) => c.id !== closingId);
      setMonthlyClosings(updated);
      localStorage.setItem(`${userStoragePrefix}_monthly_closings`, JSON.stringify(updated));

      if (currentUser) {
        try {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'monthly_closings', closingId));

          const latestDocRef = doc(db, 'users', currentUser.uid, 'backups', 'latest');
          const snap = await getDoc(latestDocRef);
          if (snap.exists() && snap.data()?.dataJson) {
            const parsed = JSON.parse(snap.data().dataJson);
            parsed.monthlyClosings = updated;
            await setDoc(
              latestDocRef,
              {
                dataJson: JSON.stringify(parsed),
                timestamp: Date.now(),
              },
              { merge: true }
            );
          }
        } catch (e) {
          console.error('Error removing monthly closing from cloud:', e);
        }
      }

      return {
        success: true,
        message: `Tutup buku periode ${existing.monthLabel} berhasil dibuka kembali. Alokasi laba/rugi ke Laba Ditahan telah disesuaikan.`,
      };
    },
    [monthlyClosings, userStoragePrefix, currentUser]
  );

  const toggleAutoSync = useCallback((enabled: boolean) => {
    setCloudSyncState((prev) => ({ ...prev, autoSyncEnabled: enabled }));
  }, []);

  const updateCloudEndpoint = useCallback((url: string) => {
    setCloudSyncState((prev) => ({ ...prev, cloudEndpoint: url }));
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setAppSettings((prev) => ({ ...prev, themeMode: mode }));
  }, []);

  const setColorPalette = useCallback((palette: ColorPalette) => {
    setAppSettings((prev) => ({ ...prev, colorPalette: palette }));
  }, []);

  const setDateFormat = useCallback((dateFormat: DateFormatOption) => {
    setAppSettings((prev) => ({ ...prev, dateFormat }));
  }, []);

  const setTimeFormat = useCallback((timeFormat: TimeFormatOption) => {
    setAppSettings((prev) => ({ ...prev, timeFormat }));
  }, []);

  const connectGoogleAccount = useCallback((email: string) => {
    setAppSettings((prev) => ({
      ...prev,
      googleAccountEmail: email,
      isGoogleConnected: true,
      lastGoogleSyncTimestamp: Date.now(),
    }));
  }, []);

  const disconnectGoogleAccount = useCallback(() => {
    setAppSettings((prev) => ({ ...prev, isGoogleConnected: false }));
  }, []);

  const toggleRealtimeSync = useCallback((enabled: boolean) => {
    setAppSettings((prev) => ({ ...prev, realtimeSyncEnabled: enabled }));
  }, []);

  const formatRupiah = useCallback((amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace('Rp', 'Rp ');
  }, []);

  const formatDateTime = useCallback(
    (millis: number): string => {
      const d = new Date(millis);
      let datePart = '';
      if (appSettings.dateFormat === 'SLASH_DMY') {
        datePart = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
      } else if (appSettings.dateFormat === 'FULL_DATE') {
        datePart = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
      } else if (appSettings.dateFormat === 'ISO_DATE') {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        datePart = `${y}-${m}-${day}`;
      } else {
        datePart = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
      }

      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d);
      const is12Hour = appSettings.timeFormat === 'HOUR_12';
      const timePart = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: is12Hour,
      }).format(d);

      return `${dayName}, ${datePart} • ${timePart}`;
    },
    [appSettings.dateFormat, appSettings.timeFormat]
  );

  const formatDateOnly = useCallback(
    (millis: number): string => {
      const d = new Date(millis);
      if (appSettings.dateFormat === 'SLASH_DMY') {
        return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
      } else if (appSettings.dateFormat === 'FULL_DATE') {
        return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
      } else if (appSettings.dateFormat === 'ISO_DATE') {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
    },
    [appSettings.dateFormat]
  );

  const formatTimeOnly = useCallback(
    (millis: number): string => {
      const d = new Date(millis);
      return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: appSettings.timeFormat === 'HOUR_12',
      }).format(d);
    },
    [appSettings.timeFormat]
  );

  const exportExcelCsv = useCallback(() => {
    const lines: string[] = [];

    const writeRow = (...cols: string[]) => {
      const escaped = cols.map((col) => `"${String(col).replace(/"/g, '""')}"`);
      lines.push(escaped.join(','));
    };

    const writeEmpty = () => {
      lines.push('');
    };

    const dateHuman = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    writeRow('BUKUKAS PRO - LAPORAN KEUANGAN PRIBADI');
    writeRow('Tanggal Ekspor', dateHuman);
    writeRow('Akun Pemilik', currentUser?.email || 'Pengguna Lokal');
    writeRow('Format', 'Microsoft Excel Spreadsheet (.csv)');
    writeEmpty();

    writeRow('=== NERACA KEUANGAN (BALANCE SHEET) ===');
    writeRow('Komponen', 'Nominal (Rp)', 'Status Persamaan Akuntansi');
    writeRow('Total Harta (Aktiva)', balanceSheet.totalHarta.toFixed(2), 'Aktiva');
    writeRow('Total Utang (Kewajiban)', balanceSheet.totalUtang.toFixed(2), 'Pasiva');
    writeRow('Total Modal (Ekuitas)', balanceSheet.totalModal.toFixed(2), 'Pasiva');
    writeRow('Laba Periode Berjalan', balanceSheet.currentPeriodNetProfit.toFixed(2), 'Pasiva');
    writeRow(
      'Total Pasiva (Utang + Modal + Laba)',
      balanceSheet.totalPasiva.toFixed(2),
      balanceSheet.isBalanced ? 'SEIMBANG (BALANCED)' : 'SELISIH'
    );
    writeEmpty();

    writeRow('=== LAPORAN LABA RUGI (INCOME STATEMENT) ===');
    writeRow('Kategori', 'Nominal (Rp)', 'Keterangan');
    writeRow('Total Pendapatan', incomeStatement.totalPendapatan.toFixed(2), 'Pemasukan');
    writeRow('Total Biaya/Beban', incomeStatement.totalBiaya.toFixed(2), 'Pengeluaran');
    writeRow(
      'Laba/Rugi Bersih',
      incomeStatement.netProfitOrLoss.toFixed(2),
      incomeStatement.netProfitOrLoss >= 0 ? 'Surplus (+)' : 'Defisit (-)'
    );
    writeEmpty();

    writeRow('=== RINCIAN SALDO AWAL & SALDO AKHIR SUB AKUN ===');
    writeRow(
      'Kode Akun',
      'Kategori Utama',
      'Nama Subakun',
      'Saldo Awal (Rp)',
      'Saldo Akhir (Rp)',
      'Jumlah Transaksi'
    );
    const sorted = [...accountsWithBalances].sort((a, b) => a.account.code.localeCompare(b.account.code));
    for (const item of sorted) {
      writeRow(
        item.account.code,
        CATEGORY_DETAILS[item.account.category].displayName,
        item.account.name,
        item.account.initialBalance.toFixed(2),
        item.balance.toFixed(2),
        String(item.transactionCount)
      );
    }
    writeEmpty();

    writeRow('=== JURNAL TRANSAKSI KEUANGAN HARIAN ===');
    writeRow(
      'No',
      'Tanggal',
      'No Referensi',
      'Tipe Transaksi',
      'Kategori',
      'Akun Asal (Kredit)',
      'Akun Tujuan (Debit)',
      'Nominal (Rp)',
      'Keterangan'
    );

    const accountMap = new Map<number, SubAccount>(accounts.map((a) => [a.id, a]));

    if (transactions.length === 0) {
      writeRow('1', '-', '-', '-', '-', '-', '-', '0.00', 'Belum ada transaksi tercatat');
    } else {
      transactions.forEach((tx, idx) => {
        const fromAcc = accountMap.get(tx.fromAccountId);
        const toAcc = accountMap.get(tx.toAccountId);
        const dateStr = formatDateTime(tx.date);

        writeRow(
          String(idx + 1),
          dateStr,
          tx.referenceNumber,
          tx.type,
          CATEGORY_DETAILS[tx.category]?.displayName || tx.category,
          fromAcc ? `${fromAcc.code} ${fromAcc.name}` : `ID ${tx.fromAccountId}`,
          toAcc ? `${toAcc.code} ${toAcc.name}` : `ID ${tx.toAccountId}`,
          tx.amount.toFixed(2),
          tx.description
        );
      });
    }
    writeEmpty();

    writeRow('=== REKAPITULASI TUTUP BUKU BULANAN & ALOKASI LABA DITAHAN ===');
    writeRow(
      'No',
      'ID Periode',
      'Bulan / Tahun',
      'Tanggal Ditutup',
      'Total Pendapatan (Rp)',
      'Total Biaya (Rp)',
      'Laba/Rugi Bersih (Rp)',
      'Akun Laba Ditahan',
      'Catatan'
    );
    if (monthlyClosings.length === 0) {
      writeRow('1', '-', '-', '-', '0.00', '0.00', '0.00', '-', 'Belum ada tutup buku bulanan yang dieksekusi');
    } else {
      monthlyClosings.forEach((c, idx) => {
        writeRow(
          String(idx + 1),
          c.id,
          c.monthLabel,
          formatDateTime(c.closedAt),
          c.totalPendapatan.toFixed(2),
          c.totalBiaya.toFixed(2),
          c.netProfitOrLoss.toFixed(2),
          c.retainedEarningsAccountName,
          c.notes || '-'
        );
      });
    }

    const BOM = '\uFEFF';
    const csvContent = BOM + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Keuangan_BukuKas_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [
    balanceSheet,
    incomeStatement,
    accountsWithBalances,
    accounts,
    transactions,
    monthlyClosings,
    formatDateTime,
    currentUser,
  ]);

  const value: FinanceContextType = {
    accounts,
    transactions,
    monthlyClosings,
    accountsWithBalances,
    categorySummaries,
    balanceSheet,
    incomeStatement,
    dailyExpenses,
    cloudSyncState,
    cloudSyncLogs,
    appSettings,
    searchQuery,
    selectedCategoryFilter,
    setSearchQuery,
    setSelectedCategoryFilter,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addSubAccount,
    deleteSubAccount,
    updateSubAccountInitialBalance,
    updateMultipleInitialBalances,
    resetAllDataToCustomChartOfAccounts,
    clearAllTransactions,
    syncNow,
    createCloudBackup,
    restoreFromGoogleBackup,
    toggleAutoSync,
    updateCloudEndpoint,
    executeMonthlyClosing,
    reopenMonthlyClosing,
    getMonthProfitAndLoss,
    setThemeMode,
    setColorPalette,
    setDateFormat,
    setTimeFormat,
    connectGoogleAccount,
    disconnectGoogleAccount,
    toggleRealtimeSync,
    formatRupiah,
    formatDateTime,
    formatDateOnly,
    formatTimeOnly,
    exportExcelCsv,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
