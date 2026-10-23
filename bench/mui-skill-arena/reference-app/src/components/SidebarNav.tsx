import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded';
import { navGroups } from '../nav';
import { T } from '../tokens';

interface SidebarNavProps {
  onNavigate?: () => void;
}

function WorkspaceSelector() {
  return (
    <ButtonBase
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 1,
        textAlign: 'left',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        px: 1,
        py: 0.75,
        '&:hover': { bgcolor: T.fieldBg },
      }}
    >
      <Avatar sx={{ width: 26, height: 26, fontSize: 10.5, bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
        AC
      </Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography noWrap sx={{ display: 'block', fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>
          Acme Corp
        </Typography>
        <Typography noWrap sx={{ display: 'block', fontSize: 10.5, color: 'text.secondary', lineHeight: 1.3 }}>
          Finance workspace
        </Typography>
      </Box>
      <UnfoldMoreRounded sx={{ fontSize: 16, color: 'text.secondary' }} />
    </ButtonBase>
  );
}

function UpgradeCard() {
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2.5,
        p: 2,
        overflow: 'hidden',
        color: '#fff',
        background: 'linear-gradient(140deg, #4F46E5 0%, #6D28D9 62%, #0F766E 125%)',
        boxShadow: '0 10px 24px rgba(79, 70, 229, 0.28)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(120px 80px at 90% 0%, rgba(255,255,255,0.24), transparent 70%)',
        }}
      />
      <Typography sx={{ position: 'relative', fontSize: 13, fontWeight: 700 }}>Upgrade to Scale</Typography>
      <Typography sx={{ position: 'relative', mt: 0.5, fontSize: 11.5, lineHeight: 1.45, opacity: 0.86 }}>
        Unlimited entities, SSO and audit logs.
      </Typography>
      <Button
        variant="contained"
        size="small"
        sx={{
          position: 'relative',
          mt: 1.5,
          minHeight: 28,
          py: 0,
          fontSize: 11.5,
          bgcolor: '#fff',
          color: '#4338CA',
          '&:hover': { bgcolor: '#EEF2FF' },
        }}
      >
        See plans
      </Button>
    </Box>
  );
}

function StorageCard() {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.5 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Storage
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          68%
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={68} sx={{ my: 1 }} aria-label="Storage used" />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        6.8 GB of 10 GB used
      </Typography>
      <Box>
        <Button size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />} sx={{ mt: 0.5, px: 0, minHeight: 0, fontSize: 11.5 }}>
          Upgrade plan
        </Button>
      </Box>
    </Box>
  );
}

function UserCard() {
  return (
    <Stack direction="row" sx={{ px: 1, py: 0.75, alignItems: 'center', gap: 1 }}>
      <Avatar sx={{ width: 32, height: 32, fontSize: 11.5, bgcolor: T.primaryTintStrong, color: 'primary.main' }}>AM</Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>
          Ana Martins
        </Typography>
        <Typography noWrap sx={{ display: 'block', fontSize: 10.5, color: 'text.secondary', lineHeight: 1.35 }}>
          Owner · Acme Corp
        </Typography>
      </Box>
      <IconButton size="small" aria-label="Account options">
        <MoreHoriz sx={{ fontSize: 18 }} />
      </IconButton>
    </Stack>
  );
}

export default function SidebarNav({ onNavigate }: SidebarNavProps) {
  const [selected, setSelected] = useState('overview');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ px: 0.5 }}>
        <WorkspaceSelector />
      </Box>

      <Box sx={{ mt: 2, overflowY: 'auto', minHeight: 0 }}>
        {navGroups.map((group) => (
          <Box key={group.label} component="nav" aria-label={group.label}>
            <Typography
              variant="overline"
              sx={{ display: 'block', px: 2.5, mt: 1.5, mb: 0.5, color: 'text.secondary', fontSize: 10 }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    selected={selected === item.id}
                    onClick={() => {
                      setSelected(item.id);
                      onNavigate?.();
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{ primary: { sx: { fontSize: 13, fontWeight: selected === item.id ? 600 : 500 } } }}
                    />
                    {item.badge ? (
                      <Chip
                        label={item.badge}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10.5,
                          bgcolor: T.primaryTint,
                          color: 'primary.main',
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    ) : null}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ px: 0.5, mt: 2 }}>
        <UpgradeCard />
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 8 }} />

      <Box sx={{ px: 0.5 }}>
        <StorageCard />
      </Box>
      <Box sx={{ px: 0.5, mt: 1, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <UserCard />
      </Box>
    </Box>
  );
}
