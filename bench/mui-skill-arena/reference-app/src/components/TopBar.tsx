import { useState } from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import AddRounded from '@mui/icons-material/AddRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import NotificationsNone from '@mui/icons-material/NotificationsNone';
import SearchIcon from '@mui/icons-material/Search';
import { T } from '../tokens';

function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  if (!mode) return null;
  const isDark = mode === 'dark';
  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        size="small"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={() => setMode(isDark ? 'light' : 'dark')}
      >
        {isDark ? <LightModeOutlined sx={{ fontSize: 20 }} /> : <DarkModeOutlined sx={{ fontSize: 20 }} />}
      </IconButton>
    </Tooltip>
  );
}

export default function TopBar() {
  const [range, setRange] = useState('30d');

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        height: 68,
        flexShrink: 0,
        alignItems: 'center',
        gap: 2,
        px: { md: 3, lg: 4 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: { xs: 'none', md: 'flex' },
      }}
    >
      <Stack direction="row" sx={{ minWidth: 0, alignItems: 'center', gap: 0.75 }}>
        <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
          Workspace
        </Typography>
        <ChevronRightRounded sx={{ fontSize: 15, color: 'text.disabled' }} />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Overview
        </Typography>
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          alignItems: 'center',
          gap: 1,
          width: 224,
          height: 36,
          px: 1.25,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: T.fieldBg,
        }}
      >
        <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Box
          component="input"
          type="text"
          placeholder="Search anything…"
          aria-label="Search"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            border: 0,
            outline: 0,
            bgcolor: 'transparent',
            color: 'text.primary',
            fontSize: 13,
            fontFamily: 'inherit',
            '&::placeholder': { color: 'text.secondary', opacity: 0.9 },
          }}
        />
        <Box
          component="kbd"
          sx={{
            fontFamily: 'inherit',
            fontSize: 10,
            px: 0.6,
            py: 0.2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
            bgcolor: 'background.paper',
          }}
        >
          ⌘K
        </Box>
      </Box>

      <Box
        sx={{
          display: { xs: 'none', lg: 'block' },
          p: 0.5,
          borderRadius: 2.5,
          bgcolor: T.fieldBg,
        }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={range}
          onChange={(_event, value) => {
            if (value) setRange(value);
          }}
          aria-label="Date range"
        >
          <ToggleButton value="7d">7d</ToggleButton>
          <ToggleButton value="30d">30d</ToggleButton>
          <ToggleButton value="90d">90d</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Tooltip title="Notifications">
        <IconButton size="small" aria-label="Notifications">
          <Badge badgeContent={3} color="error">
            <NotificationsNone sx={{ fontSize: 20 }} />
          </Badge>
        </IconButton>
      </Tooltip>

      <ThemeToggle />

      <Button
        variant="outlined"
        size="small"
        startIcon={<FileDownloadOutlined sx={{ fontSize: 17 }} />}
        sx={{ borderColor: 'divider', color: 'text.primary', ml: 0.5 }}
      >
        Export
      </Button>
      <Button variant="contained" size="small" startIcon={<AddRounded sx={{ fontSize: 18 }} />}>
        New report
      </Button>
    </Box>
  );
}
