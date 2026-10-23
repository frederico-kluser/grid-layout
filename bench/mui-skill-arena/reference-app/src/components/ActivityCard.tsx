import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import Surface from './Surface';
import { activity } from '../data';
import type { TransactionTone } from '../data';
import { T } from '../tokens';

const TONES: Record<TransactionTone, { bg: string; fg: string }> = {
  primary: { bg: T.primaryTint, fg: 'primary.main' },
  secondary: { bg: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.1)', fg: 'secondary.main' },
  warning: { bg: T.warningTint, fg: 'warning.main' },
  neutral: { bg: T.neutralTint, fg: 'text.secondary' },
  error: { bg: T.errorTint, fg: 'error.main' },
};

export default function ActivityCard() {
  return (
    <Surface sx={{ p: { xs: 2, md: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography variant="h6">Team activity</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Latest actions across your workspace
          </Typography>
        </Box>
        <IconButton size="small" aria-label="Activity card options">
          <MoreHoriz sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      <Stack sx={{ mt: 1.5 }} divider={<Divider flexItem />}>
        {activity.map((item) => {
          const tone = TONES[item.tone];
          return (
            <Stack key={item.id} direction="row" sx={{ py: 1.5, alignItems: 'flex-start', gap: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 11, bgcolor: tone.bg, color: tone.fg }}>
                {item.initials}
              </Avatar>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, color: 'text.primary' }}>
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Box>{' '}
                  {item.action}{' '}
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {item.target}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{item.time}</Typography>
              </Box>
            </Stack>
          );
        })}
      </Stack>

      <Box sx={{ mt: 'auto', pt: 1 }}>
        <Button size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}>
          View activity log
        </Button>
      </Box>
    </Surface>
  );
}
