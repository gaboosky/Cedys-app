import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App.jsx';

Sentry.init({
  dsn: 'https://7a828fe82aeab7d30a95ddebd2647dbc@o4512057187303424.ingest.us.sentry.io/4512057194381312',
  environment: import.meta.env.MODE,
  sendDefaultPii: false,
});

function PantallaError({ error, resetError }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          color: 'white',
          fontSize: '20px',
          fontWeight: 600,
          marginBottom: '8px',
        }}
      >
        Algo salió mal
      </p>
      <p
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          marginBottom: '20px',
        }}
      >
        Ya nos avisaron del problema. Intenta de nuevo.
      </p>
      <button
        onClick={resetError}
        style={{
          background: '#03CDE6',
          color: '#0A0A0A',
          fontWeight: 600,
          padding: '12px 24px',
          borderRadius: '12px',
          border: 'none',
          fontSize: '14px',
        }}
      >
        Reintentar
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={PantallaError}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);

// Cuando llega una versión nueva de la app, recarga la pantalla sola
// para que se vea el cambio, aunque la app ya estuviera instalada.
if ('serviceWorker' in navigator) {
  let yaRecargo = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (yaRecargo) return;
    yaRecargo = true;
    window.location.reload();
  });
}
