export type KpiTone = 'primary' | 'secondary' | 'warning' | 'success';

export interface Kpi {
  id: string;
  icon: 'revenue' | 'customers' | 'conversion' | 'churn';
  label: string;
  value: string;
  delta: string;
  deltaTone: 'success' | 'error';
  hint: string;
  tone: KpiTone;
  spark: number[];
}

export const kpis: Kpi[] = [
  {
    id: 'revenue',
    icon: 'revenue',
    label: 'Total revenue',
    value: '$128,430',
    delta: '+12.4%',
    deltaTone: 'success',
    hint: 'vs. $114,210 last month',
    tone: 'primary',
    spark: [58, 62, 60, 71, 68, 76, 82, 79, 88, 94, 101, 112],
  },
  {
    id: 'customers',
    icon: 'customers',
    label: 'Active customers',
    value: '8,942',
    delta: '+3.1%',
    deltaTone: 'success',
    hint: 'vs. 8,673 last month',
    tone: 'secondary',
    spark: [40, 44, 43, 48, 52, 51, 57, 60, 59, 64, 68, 71],
  },
  {
    id: 'conversion',
    icon: 'conversion',
    label: 'Conversion rate',
    value: '4.86%',
    delta: '-0.4%',
    deltaTone: 'error',
    hint: 'vs. 5.26% last month',
    tone: 'warning',
    spark: [60, 58, 61, 57, 55, 58, 54, 52, 55, 51, 49, 47],
  },
  {
    id: 'churn',
    icon: 'churn',
    label: 'Churn rate',
    value: '1.9%',
    delta: '-0.3%',
    deltaTone: 'success',
    hint: 'vs. 2.2% last month',
    tone: 'success',
    spark: [30, 32, 31, 28, 27, 29, 26, 24, 25, 22, 21, 19],
  },
];

export interface TrafficSource {
  label: string;
  pct: number;
  sessions: string;
  color: string;
}

export const trafficSources: TrafficSource[] = [
  { label: 'Direct', pct: 42, sessions: '20,244', color: '#4F46E5' },
  { label: 'Organic search', pct: 31, sessions: '14,942', color: '#0EA5A4' },
  { label: 'Referral', pct: 18, sessions: '8,676', color: '#F59E0B' },
  { label: 'Social', pct: 9, sessions: '4,338', color: '#94A3B8' },
];

export type TransactionTone = 'primary' | 'secondary' | 'warning' | 'neutral' | 'error';
export type TransactionStatus = 'Paid' | 'Pending' | 'Refunded';

export interface Transaction {
  id: string;
  initials: string;
  name: string;
  email: string;
  date: string;
  method: string;
  amount: string;
  status: TransactionStatus;
  tone: TransactionTone;
}

export const transactions: Transaction[] = [
  {
    id: 'tx-1',
    initials: 'NL',
    name: 'Northwind Labs',
    email: 'billing@northwind.io',
    date: 'Oct 21',
    method: 'Visa •••• 4242',
    amount: '$8,240.00',
    status: 'Paid',
    tone: 'primary',
  },
  {
    id: 'tx-2',
    initials: 'LS',
    name: 'Lumen Studio',
    email: 'hello@lumen.studio',
    date: 'Oct 20',
    method: 'Mastercard •••• 8891',
    amount: '$3,120.50',
    status: 'Paid',
    tone: 'secondary',
  },
  {
    id: 'tx-3',
    initials: 'KC',
    name: 'Kite & Co.',
    email: 'ops@kite.co',
    date: 'Oct 19',
    method: 'ACH transfer',
    amount: '$12,880.00',
    status: 'Pending',
    tone: 'warning',
  },
  {
    id: 'tx-4',
    initials: 'VH',
    name: 'Vertex Health',
    email: 'finance@vertex.health',
    date: 'Oct 18',
    method: 'Visa •••• 1043',
    amount: '$2,450.00',
    status: 'Paid',
    tone: 'neutral',
  },
  {
    id: 'tx-5',
    initials: 'AC',
    name: 'Aria Commerce',
    email: 'billing@aria.shop',
    date: 'Oct 17',
    method: 'Amex •••• 3007',
    amount: '$940.00',
    status: 'Refunded',
    tone: 'error',
  },
];

export interface ActivityItem {
  id: string;
  initials: string;
  tone: TransactionTone;
  name: string;
  action: string;
  target: string;
  time: string;
}

export const activity: ActivityItem[] = [
  {
    id: 'a1',
    initials: 'SM',
    tone: 'primary',
    name: 'Sofia Martins',
    action: 'approved invoice',
    target: '#INV-2041',
    time: '12 min ago',
  },
  {
    id: 'a2',
    initials: 'LC',
    tone: 'secondary',
    name: 'Lucas Chen',
    action: 'invited',
    target: '3 teammates',
    time: '48 min ago',
  },
  {
    id: 'a3',
    initials: 'RB',
    tone: 'warning',
    name: 'Rafael Braga',
    action: 'exported',
    target: 'Q3 report',
    time: '2 h ago',
  },
  {
    id: 'a4',
    initials: 'AK',
    tone: 'neutral',
    name: 'Amara Khan',
    action: 'updated',
    target: 'payment method',
    time: '5 h ago',
  },
];
