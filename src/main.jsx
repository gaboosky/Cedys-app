import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Si algo se rompe dentro de la app, muestra una pantalla amable en vez de quedar en blanco.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('Error en la app:', error, info);
  }
  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback;
      return (
        <Fallback
          error={this.state.error}
          resetError={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

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
        Intenta de nuevo. Si sigue pasando, avísale al gimnasio.
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
    <ErrorBoundary fallback={PantallaError}>
      <App />
    </ErrorBoundary>
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
