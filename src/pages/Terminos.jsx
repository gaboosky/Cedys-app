export default function Privacidad() {
  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="text-white/40 text-xs mb-6">
        Última actualización:{' '}
        {new Date().toLocaleDateString('es-CL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      <div className="flex flex-col gap-6 text-white/70 text-sm leading-relaxed">
        <section>
          <p className="text-white font-display text-lg mb-2">
            1. Quiénes tratan tus datos
          </p>
          <p>
            Esta aplicación es operada por CED&S (Ciencias del Entrenamiento
            para el Deporte y la Salud) para la gestión de socios, reservas de
            clases, rutinas de entrenamiento y registro de progreso físico de
            sus usuarios.
          </p>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            2. Qué datos recopilamos
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1">
            <li>
              Datos de identificación: nombre, RUT, nacionalidad, fecha de
              nacimiento.
            </li>
            <li>Datos de contacto: correo electrónico y teléfono.</li>
            <li>
              Datos de tu membresía: plan contratado, sesiones utilizadas,
              historial de reservas y asistencia.
            </li>
            <li>
              Datos de entrenamiento: rutinas asignadas, peso corporal, cargas
              de ejercicios y fotos de progreso que tú decidas subir.
            </li>
            <li>Fotografía de perfil, si decides subir una.</li>
          </ul>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            3. Para qué usamos tus datos
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1">
            <li>Gestionar tu cuenta y tu membresía en el gimnasio.</li>
            <li>Permitirte reservar y cancelar clases.</li>
            <li>
              Que tu coach pueda asignarte y ajustar tu rutina de entrenamiento.
            </li>
            <li>
              Mostrarte tu propia evolución de peso y rendimiento en el tiempo.
            </li>
            <li>
              Enviarte notificaciones sobre tus clases, tu membresía y novedades
              del gimnasio.
            </li>
          </ul>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            4. Dónde se almacenan tus datos
          </p>
          <p>
            Tus datos se almacenan en servidores de Supabase, un proveedor de
            infraestructura en la nube con medidas de seguridad estándar de la
            industria (cifrado en tránsito y control de acceso). El acceso a tu
            información está restringido según tu rol dentro de la aplicación.
          </p>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            5. Con quién compartimos tus datos
          </p>
          <p>
            No vendemos ni compartimos tus datos con terceros para fines
            comerciales. Tu coach y el administrador del gimnasio pueden ver la
            información necesaria para prestarte el servicio (por ejemplo, tu
            coach ve tu rutina y asistencia; el administrador ve tu membresía y
            datos de contacto).
          </p>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            6. Tus derechos
          </p>
          <p>
            De acuerdo con la Ley N° 19.628 sobre Protección de la Vida Privada,
            puedes solicitar en cualquier momento acceder, rectificar, cancelar
            o oponerte al tratamiento de tus datos personales, escribiendo a
            través de WhatsApp o correo a CED&S (ver sección "Dudas y consultas"
            dentro de la app).
          </p>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            7. Eliminación de tu cuenta
          </p>
          <p>
            Puedes solicitar la eliminación de tu cuenta y tus datos personales
            en cualquier momento. Algunos registros podrían conservarse por un
            período limitado si existe una obligación legal o administrativa que
            lo requiera (por ejemplo, respaldo de pagos).
          </p>
        </section>

        <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <p className="text-white/40 text-xs">
            Este documento es una guía general y no reemplaza el consejo de un
            abogado. Si tienes dudas específicas sobre el cumplimiento legal de
            esta política, te recomendamos que la revise un profesional antes de
            considerarla definitiva.
          </p>
        </section>
      </div>
    </div>
  );
}
