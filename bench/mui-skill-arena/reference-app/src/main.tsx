import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { ThemeProvider } from '@mui/material/styles';
import App from './App';
import theme from './theme';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InitColorSchemeScript defaultMode="light" />
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
