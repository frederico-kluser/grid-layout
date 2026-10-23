import type { ReactElement } from 'react';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import InsertChartOutlined from '@mui/icons-material/InsertChartOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import QueryStatsOutlined from '@mui/icons-material/QueryStatsOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';

export interface NavItem {
  id: string;
  label: string;
  icon: ReactElement;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview', label: 'Overview', icon: <DashboardOutlined sx={{ fontSize: 19 }} /> },
      { id: 'transactions', label: 'Transactions', icon: <ReceiptLongOutlined sx={{ fontSize: 19 }} /> },
      { id: 'analytics', label: 'Analytics', icon: <QueryStatsOutlined sx={{ fontSize: 19 }} /> },
      { id: 'invoices', label: 'Invoices', icon: <DescriptionOutlined sx={{ fontSize: 19 }} />, badge: '12' },
      { id: 'customers', label: 'Customers', icon: <PeopleAltOutlined sx={{ fontSize: 19 }} /> },
    ],
  },
  {
    label: 'Pinned',
    items: [
      { id: 'pinned-q3', label: 'Q3 revenue report', icon: <InsertChartOutlined sx={{ fontSize: 19 }} /> },
      { id: 'pinned-payroll', label: 'Payroll — October', icon: <AccountBalanceWalletOutlined sx={{ fontSize: 19 }} /> },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', label: 'Settings', icon: <SettingsOutlined sx={{ fontSize: 19 }} /> },
      { id: 'help', label: 'Help center', icon: <HelpOutlineRounded sx={{ fontSize: 19 }} /> },
    ],
  },
];
