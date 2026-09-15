import { ExternalLink } from 'lucide-react';

const LINK_FORM =
  'https://docs.google.com/forms/d/e/1FAIpQLSfUWWCQPOlvTI5a7tVhAqOti3aYzLIp7N2Np9wAubf5pgxFHQ/viewform';

export default function Terminos() {
  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="bg-white/[0.04] border border-cyan-brand/25 rounded-2xl p-4 mb-6">
        <p className="text-white/80 text-sm leading-relaxed">
          ¡Bienvenid@ a CED&S! Nos esforzamos por ofrecerte un ambiente acogedor
          y estimulante donde puedas alcanzar tus metas deportivas, mejorar tu
          salud y condición física. Estos son los términos y condiciones de uso
          de nuestro centro de entrenamiento.
        </p>
      </div>

      <div className="flex flex-col gap-6 text-white/70 text-sm leading-relaxed">
        <section>
          <p className="text-white font-display text-lg mb-2">
            1. Aceptación de los Términos y Condiciones
          </p>
          <p>
            Al acceder y utilizar las instalaciones del Centro de Entrenamiento
            CED&S, así como participar en nuestras clases y actividades, aceptas
            cumplir con los términos y condiciones establecidos en este
            documento.
          </p>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            2. Uso de las Instalaciones
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1">
            <li>
              El acceso a las instalaciones está sujeto a disponibilidad y al
              pago de las tarifas correspondientes.
            </li>
            <li>
              Los usuarios deben respetar las normas de conducta y seguridad
              establecidas en todo momento.
            </li>
            <li>
              Los usuarios deben colaborar con la limpieza del lugar respetando
              las normas de higiene y orden, utilizando adecuadamente todas las
              instalaciones del recinto.
            </li>
          </ul>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            3. Responsabilidad CED&S
          </p>
          <p className="mb-2">
            CED&S no se hace responsable de lesiones personales, accidentes o
            daños a la propiedad que puedan ocurrir durante el uso de las
            instalaciones o la participación en las clases y actividades, cuando
            estos deriven de acciones voluntarias del usuario fuera de lo
            indicado por el personal a cargo. Si el usuario daña la propiedad o
            implementos, es totalmente responsable de reponer el daño causado.
          </p>
          <p className="mb-2">
            Los usuarios son responsables de su propia salud y condición física
            al participar en nuestras actividades.
          </p>
          <p>
            Los objetos extraviados se conservan en el establecimiento por un
            período de 15 días. Pasado ese plazo sin ser reclamados, se
            procederá a su disposición final.
          </p>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            4. Procedimientos para utilizar correctamente los planes
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1.5">
            <li>
              Todos los usuarios deben mantener al día los pagos de sus planes.
              Sin el pago al día, el acceso a las clases queda restringido hasta
              renovar.
            </li>
            <li>
              Al adquirir un plan, este queda automáticamente activo. Para
              congelarlo debes avisar con al menos 7 días de anticipación. Se
              permite congelar por un máximo de 1 mes; para extenderlo se
              requiere certificado de estudios, laboral o médico.
            </li>
            <li>
              Las reservas y cancelaciones se hacen mediante la aplicación, o
              solicitando por WhatsApp. Las reservas deben hacerse con un mínimo
              de 12 horas de anticipación.
            </li>
            <li>
              Los planes se venden por sesiones semanales, según el tipo de plan
              (mensual, trimestral, semestral, anual). Si usas todas tus
              sesiones antes de la fecha de vencimiento del plan, no se agregan
              sesiones adicionales hasta la renovación.
            </li>
            <li>
              No se realizan reembolsos de dinero, excepto en los casos que
              estipule la ley del consumidor o expulsión del centro. Los planes
              sí son transferibles a otra persona.
            </li>
            <li>
              En caso de expulsión por violaciones graves a las normas de
              convivencia, se aplica una penalización del 90% del pago.
            </li>
            <li>
              Para cancelar una clase y recuperar la sesión, avisa con al menos
              3 horas de anticipación (por la app o WhatsApp). Sin ese aviso, la
              sesión se descuenta igual.
            </li>
            <li>
              Se recomienda llegar 5 a 10 minutos antes de la clase. Se acepta
              un atraso máximo de 15 minutos; pasado ese tiempo, se pierde la
              sesión reservada.
            </li>
            <li>
              Es obligatorio usar vestimenta cómoda y apropiada para la
              actividad deportiva.
            </li>
          </ul>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            5. Modificaciones
          </p>
          <p>
            Las modificaciones a este reglamento serán notificadas por los
            medios oficiales del centro. CED&S se reserva el derecho de admisión
            al recinto deportivo.
          </p>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            6. Normas de Sana Convivencia
          </p>
          <p className="mb-2">
            En CED&S buscamos un ambiente seguro, respetuoso y amigable para
            todos. Te pedimos cumplir con estas normas:
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1.5">
            <li>
              <span className="text-white/85">Respeto mutuo:</span> trata a
              todos con cortesía, evitando comportamientos agresivos,
              intimidatorios o discriminatorios.
            </li>
            <li>
              <span className="text-white/85">
                Cuidado de las instalaciones:
              </span>{' '}
              usa el equipo adecuadamente y reporta cualquier daño o problema al
              personal.
            </li>
            <li>
              <span className="text-white/85">Higiene personal:</span> usa ropa
              y calzado adecuados, y deja limpios los vestuarios y áreas comunes
              después de usarlos.
            </li>
            <li>
              <span className="text-white/85">Seguridad:</span> sigue siempre
              las indicaciones de los instructores.
            </li>
            <li>
              <span className="text-white/85">En las clases:</span> llega
              puntual y respeta el espacio de tus compañeros.
            </li>
            <li>
              <span className="text-white/85">Comunicación:</span> cualquier
              problema o inquietud, coméntalo de forma respetuosa al personal
              del centro.
            </li>
          </ul>
          <p className="mt-2">
            El incumplimiento de estas normas puede resultar en la suspensión
            temporal o permanente del acceso al centro.
          </p>
        </section>

        <section>
          <p className="text-white font-display text-lg mb-2">
            7. Usuarios menores de edad
          </p>
          <p className="mb-2">
            El acceso y participación en las actividades está reservado
            exclusivamente para mayores de edad. Los tutores legales de usuarios
            menores de edad deben firmar un consentimiento que autorice su
            participación.
          </p>
          <p className="mb-2">
            Ese consentimiento debe dejar establecido que CED&S no asume
            responsabilidad por lesiones físicas ocurridas durante la práctica
            deportiva, y que el adulto responsable se hace cargo de la llegada y
            el regreso del menor a su domicilio.
          </p>
          <p>
            Los tutores pueden permanecer en el recinto durante las clases del
            menor, observando o esperando en el área designada.
          </p>
        </section>

        <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-xs">
            Al registrarte, autorizas a CED&S a enviarte información a tu correo
            (promociones, documentos e información del centro), y autorizas el
            uso de imágenes donde aparezcas entrenando en el establecimiento
            para redes sociales o publicidad, salvo que indiques lo contrario.
          </p>
        </section>
      </div>

      <a
        href={LINK_FORM}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-cyan-brand text-ink font-bold rounded-2xl py-4 text-sm tracking-wide mt-8 transition-transform active:scale-[0.98]"
      >
        <ExternalLink size={16} /> Ir a firmar el formulario
      </a>
    </div>
  );
}
