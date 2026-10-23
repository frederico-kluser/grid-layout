import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InsightsIcon from '@mui/icons-material/Insights';
import SidebarNav from './SidebarNav';
import { T } from '../tokens';

const DRAWER_WIDTH = 248;

export default function Sidebar() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        [`& .${drawerClasses.paper}`]: {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          px: 1,
          py: 1.5,
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <Stack direction="row" sx={{ px: 1.5, py: 1, alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 55%, #0EA5A4 120%)',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.28)',
            }}
          >
            <InsightsIcon sx={{ fontSize: 19, color: '#fff' }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Orbit</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            label="PRO"
            size="small"
            sx={{
              height: 18,
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              bgcolor: T.primaryTint,
              color: 'primary.main',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Stack>
        <Box sx={{ flexGrow: 1, minHeight: 0, mt: 1 }}>
          <SidebarNav />
        </Box>
      </Box>
    </Drawer>
  );
}
