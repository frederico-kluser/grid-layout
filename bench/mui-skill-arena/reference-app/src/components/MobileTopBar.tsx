import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import CloseRounded from '@mui/icons-material/CloseRounded';
import InsightsIcon from '@mui/icons-material/Insights';
import MenuRounded from '@mui/icons-material/MenuRounded';
import NotificationsNone from '@mui/icons-material/NotificationsNone';
import SidebarNav from './SidebarNav';

export default function MobileTopBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          display: { xs: 'block', md: 'none' },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ minHeight: 60, gap: 1 }}>
          <IconButton edge="start" size="large" aria-label="Open navigation menu" onClick={() => setOpen(true)}>
            <MenuRounded />
          </IconButton>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 55%, #0EA5A4 120%)',
            }}
          >
            <InsightsIcon sx={{ fontSize: 16, color: '#fff' }} />
          </Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Orbit</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton aria-label="Notifications">
            <Badge badgeContent={3} color="error">
              <NotificationsNone sx={{ fontSize: 21 }} />
            </Badge>
          </IconButton>
          <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            AM
          </Avatar>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          [`& .${drawerClasses.paper}`]: {
            width: 300,
            maxWidth: '82dvw',
            boxSizing: 'border-box',
            p: 1.5,
            bgcolor: 'background.paper',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <Stack direction="row" sx={{ px: 1, pb: 1.5, alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Orbit</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton size="small" aria-label="Close navigation menu" onClick={() => setOpen(false)}>
              <CloseRounded sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
