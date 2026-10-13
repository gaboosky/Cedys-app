// Datos de ejemplo — se reemplazarán por la base de datos real (Supabase / Firebase)

export const PLANES = {
  plan_8: {
    id: 'plan_8',
    nombre: 'Plan 8 sesiones',
    sesionesTotales: 8,
    duracionDias: 30,
    precio: 45000,
  },
  plan_12: {
    id: 'plan_12',
    nombre: 'Plan 12 sesiones',
    sesionesTotales: 12,
    duracionDias: 30,
    precio: 60000,
  },
  plan_ilimitado: {
    id: 'plan_ilimitado',
    nombre: 'Plan Ilimitado',
    sesionesTotales: null,
    duracionDias: 30,
    precio: 85000,
  },
};

export const USUARIOS = [
  {
    id: 'u1',
    rol: 'usuario',
    nombre: 'Gabriel Rojas',
    rut: '18.234.567-8',
    correo: 'gabriel@correo.cl',
    telefono: '+56 9 8123 4567',
    edad: 29,
    planId: 'plan_8',
    sesionesUsadas: 3,
    fechaInicioPlan: '2026-08-15',
  },
  {
    id: 'u2',
    rol: 'usuario',
    nombre: 'Camila Torres',
    rut: '19.876.543-2',
    correo: 'camila@correo.cl',
    telefono: '+56 9 5555 1234',
    edad: 24,
    planId: 'plan_12',
    sesionesUsadas: 7,
    fechaInicioPlan: '2026-08-01',
  },
  {
    id: 'coach1',
    rol: 'coach',
    nombre: 'Fernanda Muñoz',
    rut: '15.987.654-3',
    correo: 'fernanda@ceds.cl',
    telefono: '+56 9 7654 3210',
    edad: 34,
  },
  {
    id: 'admin1',
    rol: 'head_coach',
    nombre: 'Rodrigo Espina',
    rut: '12.345.678-9',
    correo: 'rodrigo@ceds.cl',
    telefono: '+56 9 1111 2222',
    edad: 41,
  },
];

export const CLASES = [
  {
    id: 'c1',
    dia: 'Lunes',
    hora: '07:00',
    coachId: 'coach1',
    coachNombre: 'Fernanda Muñoz',
    cupoMax: 12,
    inscritos: 9,
  },
  {
    id: 'c2',
    dia: 'Lunes',
    hora: '18:30',
    coachId: 'coach1',
    coachNombre: 'Fernanda Muñoz',
    cupoMax: 12,
    inscritos: 12,
  },
  {
    id: 'c3',
    dia: 'Miércoles',
    hora: '07:00',
    coachId: 'coach1',
    coachNombre: 'Fernanda Muñoz',
    cupoMax: 12,
    inscritos: 5,
  },
  {
    id: 'c4',
    dia: 'Viernes',
    hora: '19:00',
    coachId: 'coach1',
    coachNombre: 'Fernanda Muñoz',
    cupoMax: 12,
    inscritos: 8,
  },
];
