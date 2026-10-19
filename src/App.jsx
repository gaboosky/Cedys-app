import { Suspense, useState } from 'react';
import { lazySeguro } from './lib/cargaSegura';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import InstalarApp from './components/InstalarApp';
import Bienvenida from './components/Bienvenida';
import Login from './pages/Login';
import NuevaContrasena from './pages/NuevaContrasena';

// Carga perezosa: cada pantalla se descarga solo cuando el usuario entra a ella,
// en vez de bajar toda la app de una sola vez.
const Perfil = lazySeguro(() => import('./pages/Perfil'));
const Horarios = lazySeguro(() => import('./pages/Horarios'));
const HorarioDetalle = lazySeguro(() => import('./pages/HorarioDetalle'));
const Reservas = lazySeguro(() => import('./pages/Reservas'));
const Mas = lazySeguro(() => import('./pages/Mas'));
const General = lazySeguro(() => import('./pages/General'));
const RutinaSemanas = lazySeguro(() => import('./pages/rutinas/RutinaSemanas'));
const RutinaDias = lazySeguro(() => import('./pages/rutinas/RutinaDias'));
const RutinaEjercicios = lazySeguro(() =>
  import('./pages/rutinas/RutinaEjercicios')
);
const MiRutina = lazySeguro(() => import('./pages/MiRutina'));
const MisEvaluaciones = lazySeguro(() =>
  import('./pages/coach/MisEvaluaciones')
);
const Progreso = lazySeguro(() => import('./pages/Progreso'));
const Privacidad = lazySeguro(() => import('./pages/Privacidad'));
const Terminos = lazySeguro(() => import('./pages/Terminos'));
const MisClases = lazySeguro(() => import('./pages/coach/MisClases'));
const Alumnos = lazySeguro(() => import('./pages/coach/Alumnos'));
const Dashboard = lazySeguro(() => import('./pages/admin/Dashboard'));
const Usuarios = lazySeguro(() => import('./pages/admin/Usuarios'));
const ClasesAdmin = lazySeguro(() => import('./pages/admin/ClasesAdmin'));
const Planes = lazySeguro(() => import('./pages/admin/Planes'));
const Coaches = lazySeguro(() => import('./pages/admin/Coaches'));
const Configuracion = lazySeguro(() => import('./pages/admin/Configuracion'));
const Reportes = lazySeguro(() => import('./pages/admin/Reportes'));
const NotasCoach = lazySeguro(() => import('./pages/admin/NotasCoach'));
const ReservasActivas = lazySeguro(() =>
  import('./pages/admin/ReservasActivas')
);
const PerfilAlumno = lazySeguro(() => import('./pages/admin/PerfilAlumno'));
const IngresoDetalle = lazySeguro(() => import('./pages/admin/IngresoDetalle'));
const IngresosGraficos = lazySeguro(() =>
  import('./pages/admin/IngresosGraficos')
);
const Finanzas = lazySeguro(() => import('./pages/admin/Finanzas'));
const Renovaciones = lazySeguro(() => import('./pages/admin/Renovaciones'));
const Gimnasio = lazySeguro(() => import('./pages/Gimnasio'));
const Gastos = lazySeguro(() => import('./pages/admin/Gastos'));
const Avisos = lazySeguro(() => import('./pages/admin/Avisos'));
const Actividad = lazySeguro(() => import('./pages/admin/Actividad'));
const PagoCoaches = lazySeguro(() => import('./pages/admin/PagoCoaches'));
const ClasesRealizadas = lazySeguro(() =>
  import('./pages/admin/ClasesRealizadas')
);
const SolicitudesPrueba = lazySeguro(() =>
  import('./pages/admin/SolicitudesPrueba')
);
const SeguimientoPersonal = lazySeguro(() =>
  import('./pages/SeguimientoPersonal')
);

function CargandoPantalla() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-brand/30 border-t-cyan-brand rounded-full animate-spin" />
    </div>
  );
}

function inicioSegunRol(rol) {
  if (rol === 'head_coach') return '/dashboard';
  if (rol === 'coach') return '/mis-clases';
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
          <Route path="/gimnasio" element={<Gimnasio />} />
          <Route path="/horarios" element={<Horarios />} />
          <Route
            path="/horarios/:horarioId/:fecha"
            element={<HorarioDetalle />}
          />
          <Route path="/reservas" element={<Reservas />} />

          {/* Coach */}
          <Route path="/mis-clases" element={<MisClases />} />
          <Route path="/alumnos" element={<Alumnos />} />
          <Route path="/mis-evaluaciones" element={<MisEvaluaciones />} />

          {/* Head Coach / Admin */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/usuarios/:usuarioId" element={<PerfilAlumno />} />
          <Route path="/ingreso-detalle" element={<IngresoDetalle />} />
          <Route path="/ingresos-graficos" element={<IngresosGraficos />} />
          <Route path="/finanzas" element={<Finanzas />} />
          <Route path="/renovaciones" element={<Renovaciones />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/avisos" element={<Avisos />} />
          <Route path="/actividad" element={<Actividad />} />
          <Route path="/pago-coaches" element={<PagoCoaches />} />
          <Route path="/clases-realizadas" element={<ClasesRealizadas />} />
          <Route path="/pruebas" element={<SolicitudesPrueba />} />
          <Route
            path="/seguimiento"
            element={<Navigate to="/renovaciones?tab=sin_venir" replace />}
          />
          <Route
            path="/seguimiento-personal/:usuarioId"
            element={<SeguimientoPersonal />}
          />
          <Route path="/clases-admin" element={<ClasesAdmin />} />
          <Route path="/planes" element={<Planes />} />
          <Route path="/coaches" element={<Coaches />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/notas-coach" element={<NotasCoach />} />
          <Route path="/reservas-activas" element={<ReservasActivas />} />
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
          <Route path="/terminos" element={<Terminos />} />

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

// Pantalla de inicio mientras se recupera la sesión guardada
// (así no aparece el login por un instante a quien ya había entrado).
function Arrancando() {
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-5">
      <p className="text-white text-2xl font-bold tracking-wide">
        CED<span className="text-cyan-brand">&amp;</span>S
      </p>
      <div className="w-8 h-8 border-2 border-cyan-brand/30 border-t-cyan-brand rounded-full animate-spin" />
    </div>
  );
}

function Root() {
  const { usuarioActual, iniciando } = useAuth();
  // El link de "Olvidé mi contraseña" abre esta pantalla, haya o no sesión.
  if (window.location.pathname === '/nueva-contrasena')
    return <NuevaContrasena />;
  if (iniciando) return <Arrancando />;
  // cedys.cl/prueba abre directo el formulario de sesión de prueba y cedys.cl/registro el de registro
  if (!usuarioActual) {
    const ruta = window.location.pathname;
    return (
      <Login
        inicial={
          ruta === '/prueba'
            ? 'prueba'
            : ruta === '/registro'
            ? 'registro'
            : 'login'
        }
      />
    );
  }
  return <AppShell />;
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
