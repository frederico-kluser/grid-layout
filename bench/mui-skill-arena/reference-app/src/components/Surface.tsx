import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';

/** The one card surface used across the dashboard. */
const Surface = styled(Paper)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  backgroundImage: 'none',
}));

export default Surface;
