import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import Percent from '@mui/icons-material/Percent';
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded';
import Surface from './Surface';
import Sparkline from './Sparkline';
import { C, T } from '../tokens';
import type { Kpi } from '../data';

const ICONS: Record<Kpi['icon'], ReactElement> = {
  revenue: <AccountBalanceWalletOutlined />,
  customers: <PeopleAltOutlined />,
  conversion: <Percent />,
  churn: <TrendingDownRounded />,
};

const TONES: Record<Kpi['tone'], { bg: string; fg: string; spark: string }> = {
  primary: { bg: T.primaryTint, fg: 'primary.main', spark: C.brand },
  secondary: { bg: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.1)', fg: 'secondary.main', spark: C.teal },
  warning: { bg: T.warningTint, fg: 'warning.main', spark: C.amber },
  success: { bg: T.successTint, fg: 'success.main', spark: C.green },
};

export default function KpiCard({ label, value, delta, deltaTone, hint, tone, icon, spark }: Kpi) {
  const palette = TONES[tone];

  return (
    <Surface
      sx={{
        p: { xs: 2, md: 2.5 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: palette.bg,
            color: palette.fg,
            '& svg': { fontSize: 18 },
          }}
        >
          {ICONS[icon]}
        </Box>
      </Stack>

      <Typography variant="h4" sx={{ lineHeight: 1.15 }}>
        {value}
      </Typography>

      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
        <Chip
          size="small"
          label={delta}
          sx={{
            bgcolor: deltaTone === 'success' ? T.successTint : T.errorTint,
            color: deltaTone === 'success' ? 'success.main' : 'error.main',
            fontWeight: 700,
          }}
        />
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {hint}
        </Typography>
      </Stack>

      <Box sx={{ mt: 'auto', pt: 1 }}>
        <Sparkline values={spark} color={palette.spark} />
      </Box>
    </Surface>
  );
}
