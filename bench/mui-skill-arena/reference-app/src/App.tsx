import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Sidebar from './components/Sidebar';
import MobileTopBar from './components/MobileTopBar';
import TopBar from './components/TopBar';
import KpiCard from './components/KpiCard';
import RevenueChart from './components/RevenueChart';
import TrafficSources from './components/TrafficSources';
import TransactionsTable from './components/TransactionsTable';
import ActivityCard from './components/ActivityCard';
import { kpis } from './data';

export default function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <MobileTopBar />
        <TopBar />

        <Box sx={{ px: { xs: 2, md: 3, lg: 4 }, py: { xs: 2.5, md: 3, lg: 3.5 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ mb: 3, justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}
          >
            <Box>
              <Typography variant="h4" component="h1">
                Financial overview
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                Track revenue, churn and cash flow across all entities.
              </Typography>
            </Box>
            <Stack direction="row" sx={{ pt: { sm: 1 }, alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  boxShadow: '0 0 0 3px rgb(var(--mui-palette-success-mainChannel) / 0.18)',
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Live · updated 2 min ago
              </Typography>
            </Stack>
          </Stack>

          <Grid container spacing={{ xs: 2, md: 2.5 }} sx={{ width: '100%' }}>
            {kpis.map((kpi) => (
              <Grid key={kpi.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                <KpiCard {...kpi} />
              </Grid>
            ))}

            <Grid size={{ xs: 12, lg: 8 }}>
              <RevenueChart />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <TrafficSources />
            </Grid>

            <Grid size={{ xs: 12, lg: 8 }}>
              <TransactionsTable />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <ActivityCard />
            </Grid>
          </Grid>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ mt: 4, pt: 2.5, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1 }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              © 2026 Orbit Finance, Inc. All rights reserved.
            </Typography>
            <Stack direction="row" sx={{ gap: 2.5 }}>
              <Link href="#" variant="caption" underline="hover" color="text.secondary">
                Documentation
              </Link>
              <Link href="#" variant="caption" underline="hover" color="text.secondary">
                Status
              </Link>
              <Link href="#" variant="caption" underline="hover" color="text.secondary">
                Privacy
              </Link>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
