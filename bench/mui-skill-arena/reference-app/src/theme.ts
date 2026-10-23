import { createTheme } from '@mui/material/styles';
import { C, T } from './tokens';

/**
 * Orbit Finance theme.
 * MUI v9 pattern: `cssVariables` + `colorSchemes` (light & dark) so the mode
 * toggle never re-renders the tree and never flickers.
 */
const theme = createTheme({
  cssVariables: true,
  colorSchemeSelector: 'data',
  colorSchemes: {
    light: {
      palette: {
        primary: { main: C.brand, light: C.brandSoft, dark: C.brandDark, contrastText: '#FFFFFF' },
        secondary: { main: C.teal, light: '#5EEAD4', dark: '#0F766E', contrastText: '#FFFFFF' },
        background: { default: '#F5F6FA', paper: '#FFFFFF' },
        text: { primary: '#0F172A', secondary: '#5B6478' },
        divider: '#E6E8F0',
        success: { main: C.green },
        warning: { main: '#D97706' },
        error: { main: '#DC2626' },
        info: { main: '#2563EB' },
      },
    },
    dark: {
      palette: {
        primary: { main: C.brandSoft, light: '#A5B4FC', dark: C.brand, contrastText: '#0B1020' },
        secondary: { main: '#2DD4BF', light: '#5EEAD4', dark: C.teal, contrastText: '#06201F' },
        background: { default: '#0B1020', paper: '#111A2E' },
        text: { primary: '#E8ECF6', secondary: '#9AA6BF' },
        divider: '#22304B',
        success: { main: '#4ADE80' },
        warning: { main: '#FBBF24' },
        error: { main: '#F87171' },
        info: { main: '#60A5FA' },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
    h5: { fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25 },
    h6: { fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 500 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, minHeight: 36, paddingInline: 16 },
        sizeSmall: { minHeight: 32, paddingInline: 12, fontSize: '0.8125rem' },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 10, color: 'var(--mui-palette-text-secondary)' } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, fontSize: '0.75rem' },
        sizeSmall: { height: 22, fontSize: '0.6875rem' },
        labelSmall: { paddingInline: 8 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 6, borderRadius: 999, backgroundColor: T.neutralTint },
        bar: { borderRadius: 999 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'var(--mui-palette-divider)', padding: '12px 16px' },
        head: {
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--mui-palette-text-secondary)',
          paddingTop: 10,
          paddingBottom: 10,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          border: 0,
          borderRadius: '8px !important',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.75rem',
          padding: '4px 12px',
          color: 'var(--mui-palette-text-secondary)',
          '&.Mui-selected': {
            backgroundColor: 'var(--mui-palette-background-paper)',
            color: 'var(--mui-palette-text-primary)',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.14)',
            '&:hover': { backgroundColor: 'var(--mui-palette-background-paper)' },
          },
        },
      },
    },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 38,
          marginInline: 8,
          paddingInline: 12,
          color: 'var(--mui-palette-text-secondary)',
          '&:hover': { backgroundColor: T.neutralTint },
          '&.Mui-selected': {
            backgroundColor: T.primaryTint,
            color: 'var(--mui-palette-primary-main)',
            '&:hover': { backgroundColor: T.primaryTintStrong },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: { root: { minWidth: 30, color: 'inherit' } },
    },
    MuiAvatar: {
      styleOverrides: { root: { fontWeight: 600, fontSize: '0.8125rem' } },
    },
    MuiBadge: {
      styleOverrides: { badge: { fontSize: '0.625rem', fontWeight: 700, minWidth: 16, height: 16 } },
    },
    MuiLink: {
      styleOverrides: { root: { cursor: 'pointer' } },
    },
  },
});

export default theme;
