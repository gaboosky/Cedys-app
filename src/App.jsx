import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import InstalarApp from './components/InstalarApp';
import Bienvenida from './components/Bienvenida';
import Login from './pages/Login';

// Carga perezosa: cada pantalla se descarga solo cuando el usuario entra a ella,
// en vez de bajar toda la app de una sola vez.
const Perfil = lazy(() => import('./pages/Perfil'));
const Horarios = lazy(() => import('./pages/Horarios'));
const HorarioDetalle = lazy(() => import('./pages/HorarioDetalle'));
const Reservas = lazy(() => import('./pages/Reservas'));
const Mas = lazy(() => import('./pages/Mas'));
const General = lazy(() => import('./pages/General'));
const RutinaSemanas = lazy(() => import('./pages/rutinas/RutinaSemanas'));
const RutinaDias = lazy(() => import('./pages/rutinas/RutinaDias'));
const RutinaEjercicios = lazy(() => import('./pages/rutinas/RutinaEjercicios'));
const MiRutina = lazy(() => import('./pages/MiRutina'));
const Progreso = lazy(() => import('./pages/Progreso'));
const Privacidad = lazy(() => import('./pages/Privacidad'));
const MisClases = lazy(() => import('./pages/coach/MisClases'));
const Alumnos = lazy(() => import('./pages/coach/Alumnos'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Usuarios = lazy(() => import('./pages/admin/Usuarios'));
const ClasesAdmin = lazy(() => import('./pages/admin/ClasesAdmin'));
const Planes = lazy(() => import('./pages/admin/Planes'));
const Coaches = lazy(() => import('./pages/admin/Coaches'));
const Configuracion = lazy(() => import('./pages/admin/Configuracion'));
const Reportes = lazy(() => import('./pages/admin/Reportes'));

function CargandoPantalla() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-brand/30 border-t-cyan-brand rounded-full animate-spin" />
    </div>
  );
}

function inicioSegunRol(rol) {
  if (rol === 'head_coach') return '/dashboard';
  return '/general';
}

function AppShell() {
  const { usuarioActual, rolEfectivo } = useAuth();
  const inicio = inicioSegunRol(rolEfectivo);

  const [mostrarBienvenida, setMostrarBienvenida] = useState(
    () => !localStorage.getItem(`ceds_bienvenida_${usuarioActual.id}`)
  );

  function cerrarBienvenida() {
    localStorage.setItem(`ceds_bienvenida_${usuarioActual.id}`, '1');
    setMostrarBienvenida(false);
  }

  return (
    <>
      <Header />
      <Suspense fallback={<CargandoPantalla />}>
        <Routes>
          {/* Usuario */}
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/horarios" element={<Horarios />} />
          <Route
            path="/horarios/:horarioId/:fecha"
            element={<HorarioDetalle />}
          />
          <Route path="/reservas" element={<Reservas />} />

          {/* Coach */}
          <Route path="/mis-clases" element={<MisClases />} />
          <Route path="/alumnos" element={<Alumnos />} />

          {/* Head Coach / Admin */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/clases-admin" element={<ClasesAdmin />} />
          <Route path="/planes" element={<Planes />} />
          <Route path="/coaches" element={<Coaches />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/mas" element={<Mas />} />

          {/* Compartida */}
          <Route path="/general" element={<General />} />
          <Route path="/rutinas/:rutinaId" element={<RutinaSemanas />} />
          <Route
            path="/rutinas/:rutinaId/semanas/:semanaId"
            element={<RutinaDias />}
          />
          <Route
            path="/rutinas/:rutinaId/semanas/:semanaId/dias/:diaId"
            element={<RutinaEjercicios />}
          />
          <Route path="/mi-rutina" element={<MiRutina />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="/privacidad" element={<Privacidad />} />

          <Route path="*" element={<Navigate to={inicio} replace />} />
        </Routes>
      </Suspense>
      <BottomNav />
      <InstalarApp />
      {mostrarBienvenida && (
        <Bienvenida rol={usuarioActual.rol} onCerrar={cerrarBienvenida} />
      )}
    </>
  );
}

function Root() {
  const { usuarioActual } = useAuth();
  return usuarioActual ? <AppShell /> : <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  );
}
