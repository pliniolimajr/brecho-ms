import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { initializeMonitoring } from './services/monitoring';

void initializeMonitoring();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>,
);
