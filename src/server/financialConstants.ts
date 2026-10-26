import { TransactionTrendBucket } from '../types/database';

export const RECONCILED_LEDGER_AT = '2026-10-25T06:33:00.000Z';

export const RECONCILED_FINANCIAL_TOTALS = {
  totalTransactions: 217818,
  settledTransactions: 210284,
  failedTransactions: 5898,
  reversedTransactions: 1636,
  flaggedTransactions: 3500,
  // Exact numeric sums from Supabase amount_inr (paise precision):
  settledVolumeInrExact: 1081149862.46,
  grossVolumeInrExact: 1123391729.99,
  // Rounded integer values:
  settledVolumeInrRounded: 1081149862, // ₹108.11 Cr
  grossVolumeInrRounded: 1123391730,   // ₹112.34 Cr
  avgTransactionInr: 5141.38,
  successRate: 96.54,
  dataFreshness: 'reconciled_ledger_aggregate',
  financialsSource: 'verified_ledger_snapshot',
  countsSource: 'live_supabase_head_query',
  snapshotPolicy: 'Sync Data reloads the current verified snapshot; financial aggregates do not auto-regenerate on request'
} as const;

export const MONTHLY_TREND_CACHE: TransactionTrendBucket[] = [
  { date: 'Oct 25', count: 21184, settledCount: 20427, amountLakh: 1043.3, volumeInr: 104332655.85, grossVolumeInr: 108826560.26 },
  { date: 'Nov 25', count: 21155, settledCount: 20452, amountLakh: 1057.0, volumeInr: 105698885.26, grossVolumeInr: 109030929.73 },
  { date: 'Dec 25', count: 19499, settledCount: 18795, amountLakh: 972.4, volumeInr: 97244938.46, grossVolumeInr: 100690099.77 },
  { date: 'Jan 26', count: 16741, settledCount: 16146, amountLakh: 798.9, volumeInr: 79890387.52, grossVolumeInr: 83798390.12 },
  { date: 'Feb 26', count: 14548, settledCount: 14054, amountLakh: 776.1, volumeInr: 77611179.08, grossVolumeInr: 80616473.93 },
  { date: 'Mar 26', count: 18013, settledCount: 17353, amountLakh: 916.5, volumeInr: 91645452.48, grossVolumeInr: 95356436.03 },
  { date: 'Apr 26', count: 16693, settledCount: 16117, amountLakh: 813.5, volumeInr: 81346598.11, grossVolumeInr: 85368634.95 },
  { date: 'May 26', count: 18334, settledCount: 17759, amountLakh: 891.4, volumeInr: 89139598.55, grossVolumeInr: 91635884.54 },
  { date: 'Jun 26', count: 16138, settledCount: 15589, amountLakh: 811.4, volumeInr: 81143754.27, grossVolumeInr: 84452341.76 },
  { date: 'Jul 26', count: 17939, settledCount: 17323, amountLakh: 874.5, volumeInr: 87449125.65, grossVolumeInr: 90901317.33 },
  { date: 'Aug 26', count: 18654, settledCount: 18046, amountLakh: 931.9, volumeInr: 93189273.04, grossVolumeInr: 96766327.93 },
  { date: 'Sep 26', count: 18920, settledCount: 18223, amountLakh: 924.6, volumeInr: 92458014.19, grossVolumeInr: 95948333.64 }
];
