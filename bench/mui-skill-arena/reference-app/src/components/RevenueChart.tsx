import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import Surface from './Surface';
import { C, T } from '../tokens';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REVENUE = [62, 68, 61, 74, 81, 79, 88, 92, 86, 98, 104, 124];
const EXPENSES = [40, 42, 38, 44, 47, 45, 50, 52, 49, 55, 58, 63];

const W = 640;
const H = 210;
const PAD_Y = 12;
const MAX = 140;

const chartX = (index: number) => (index / (MONTHS.length - 1)) * W;
const chartY = (value: number) => H - PAD_Y - (value / MAX) * (H - PAD_Y * 2);
const linePath = (values: number[]) =>
  values
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${chartX(index).toFixed(1)},${chartY(value).toFixed(1)}`)
    .join(' ');

function Legend({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
      <Box
        sx={{
          width: 12,
          height: 8,
          borderTop: dashed ? `2px dashed ${color}` : 'none',
          borderRadius: dashed ? 0 : '50%',
          bgcolor: dashed ? 'transparent' : color,
          m: dashed ? 0 : '2px 0',
        }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
  );
}

export default function RevenueChart() {
  return (
    <Surface sx={{ p: { xs: 2, md: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography variant="h6">Revenue</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Net revenue and expenses, last 12 months
          </Typography>
        </Box>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
          <Chip label="Monthly" size="small" variant="outlined" sx={{ borderColor: 'divider', color: 'text.secondary' }} />
          <IconButton size="small" aria-label="Revenue card options">
            <MoreHoriz sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Stack>

      <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Typography variant="h5">$1.24M</Typography>
        <Chip
          size="small"
          label="+8.2%"
          sx={{ bgcolor: T.successTint, color: 'success.main', fontWeight: 700 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
          <Legend color={C.brand} label="Revenue" />
          <Legend color={C.slate} label="Expenses" dashed />
        </Stack>
      </Stack>

      <Box sx={{ flexGrow: 1, minHeight: 190, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Box
          component="svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          sx={{ width: '100%', height: 186, display: 'block', color: 'divider' }}
        >
          <defs>
            <linearGradient id="orbit-revenue-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.brand} stopOpacity="0.26" />
              <stop offset="100%" stopColor={C.brand} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0, 35, 70, 105, 140].map((value) => (
            <line
              key={value}
              x1={0}
              x2={W}
              y1={chartY(value)}
              y2={chartY(value)}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="4 7"
              vectorEffect="non-scaling-stroke"
              opacity={0.9}
            />
          ))}
          <path d={`${linePath(REVENUE)} L ${W},${H} L 0,${H} Z`} fill="url(#orbit-revenue-area)" />
          <path
            d={linePath(EXPENSES)}
            fill="none"
            stroke={C.slate}
            strokeWidth={2}
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={linePath(REVENUE)}
            fill="none"
            stroke={C.brand}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={W - 4} cy={chartY(REVENUE[REVENUE.length - 1])} r={4} fill={C.brand} stroke="#fff" strokeWidth={2} />
        </Box>
        <Stack direction="row" sx={{ mt: 1, justifyContent: 'space-between' }}>
          {MONTHS.map((month, index) => (
            <Typography
              key={month}
              variant="caption"
              sx={{
                fontSize: 10,
                color: 'text.secondary',
                display: index % 2 === 1 ? { xs: 'none', sm: 'block' } : 'block',
              }}
            >
              {month}
            </Typography>
          ))}
        </Stack>
      </Box>

      <Box sx={{ mt: 1.5 }}>
        <Button size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}>
          Open revenue report
        </Button>
      </Box>
    </Surface>
  );
}
