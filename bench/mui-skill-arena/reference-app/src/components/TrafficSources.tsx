import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import Surface from './Surface';
import { trafficSources } from '../data';
import { T } from '../tokens';

export default function TrafficSources() {
  return (
    <Surface sx={{ p: { xs: 2, md: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6">Traffic sources</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Sessions by channel, last 30 days
        </Typography>
      </Box>

      <Stack direction="row" sx={{ flexWrap: 'wrap', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="h5">48.2k</Typography>
        <Chip size="small" label="+6.1%" sx={{ bgcolor: T.successTint, color: 'success.main', fontWeight: 700 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          sessions
        </Typography>
      </Stack>

      <Stack sx={{ mt: 2.5, gap: 2 }}>
        {trafficSources.map((source) => (
          <Box key={source.label}>
            <Stack direction="row" sx={{ mb: 0.75, alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: source.color }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {source.label}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {source.pct}%
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 46, textAlign: 'right' }}>
                {source.sessions}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={source.pct}
              aria-label={`${source.label} share`}
              sx={{ '& .MuiLinearProgress-bar': { backgroundColor: source.color } }}
            />
          </Box>
        ))}
      </Stack>

      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Button size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}>
          View full report
        </Button>
      </Box>
    </Surface>
  );
}
