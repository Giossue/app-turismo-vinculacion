import {
  LEGAL_APP_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_MINIMUM_AGE,
  LEGAL_RESPONSIBLE_ADDRESS,
  LEGAL_RESPONSIBLE_NAME,
  LEGAL_RESPONSIBLE_PHONE,
} from "./legal-responsible";
import type { LegalDocument } from "./legal.types";

/**
 * Una versión publicada no se edita: un cambio de texto crea un módulo nuevo con
 * otra fecha, para que cada constancia siga apuntando al texto que se aceptó.
 */
export const TERMS_2026_11_07: LegalDocument = {
  type: "terms",
  version: "2026-11-07",
  title: "Términos y condiciones",
  publishedAt: "2026-11-07",
  sections: [
    {
      heading: "1. Quién ofrece la app",
      body: `${LEGAL_APP_NAME} es una aplicación de información turística creada como proyecto de vinculación de la Carrera de Software, en beneficio de la ciudad de Guaranda. La ofrece la ${LEGAL_RESPONSIBLE_NAME}, con domicilio en ${LEGAL_RESPONSIBLE_ADDRESS}.\n\nPara cualquier consulta sobre estos términos puedes escribir a ${LEGAL_CONTACT_EMAIL} o llamar al ${LEGAL_RESPONSIBLE_PHONE}.`,
    },
    {
      heading: "2. Aceptación",
      body: `Para crear una cuenta debes aceptar estos términos y la Política de privacidad. Guardamos una constancia de cada aceptación con el documento, su versión y la fecha y hora de nuestro servidor.\n\nPuedes explorar parte del contenido como invitado sin crear una cuenta. Si no estás de acuerdo con estos términos, no crees una cuenta.`,
    },
    {
      heading: "3. Tu cuenta",
      body: `Debes tener al menos ${LEGAL_MINIMUM_AGE} años para crear una cuenta. La fecha de nacimiento que declaras es tu responsabilidad y debe ser verdadera, igual que el resto de tus datos.\n\nTu contraseña es personal. Cuida el acceso a tu cuenta y a tu dispositivo, porque lo que se haga desde tu sesión se entiende hecho por ti.\n\nPuedes eliminar tu cuenta cuando quieras desde la app, en Perfil, sin costo y sin dar explicaciones. La Política de privacidad explica qué ocurre con tus datos.`,
    },
    {
      heading: "4. Uso permitido",
      body: `Usa la app de forma lícita y respetuosa. No debes intentar acceder a cuentas o datos ajenos, afectar el funcionamiento del servicio, extraer su contenido de forma automatizada ni usar la app para engañar o dañar a otras personas.\n\nPodemos desactivar una cuenta que incumpla estos términos.`,
    },
    {
      heading: "5. Información turística",
      body: `La información de lugares, servicios, horarios, precios y rutas de transporte es referencial. Procuramos que esté actualizada, pero puede cambiar sin aviso o contener errores. Confirma los datos importantes antes de viajar.`,
    },
    {
      heading: "6. Mapas, rutas y navegación",
      body: `Las rutas, distancias y tiempos son estimaciones y no incluyen tráfico en tiempo real. Durante un trayecto, presta atención al camino, respeta las normas de tránsito y las señales, y no manipules el teléfono mientras conduces. La decisión de seguir una indicación es tuya.`,
    },
    {
      heading: "7. Asistente con inteligencia artificial",
      body: `El asistente genera sus respuestas de forma automatizada y puede equivocarse. Sus recomendaciones son informativas: no son asesoría profesional ni una garantía sobre un lugar o un servicio. Revisa la información antes de tomar una decisión.\n\nEl asistente requiere una cuenta. La Política de privacidad explica cómo se tratan tus consultas.`,
    },
    {
      heading: "8. Opiniones y calificaciones",
      body: `Si publicas una opinión o una calificación, debe basarse en tu experiencia y respetar a las demás personas. Las opiniones se revisan antes de mostrarse y pueden rechazarse o retirarse si incumplen estos términos.\n\nEres responsable de lo que escribes. No incluyas datos personales propios ni de otras personas en tus comentarios.`,
    },
    {
      heading: "9. Limitaciones del servicio",
      body: `La app se ofrece tal como está y puede dejar de estar disponible por mantenimiento, fallas o falta de conexión. Sin perjuicio de los derechos que la ley te reconoce, no respondemos por decisiones tomadas únicamente a partir de información referencial o de respuestas del asistente.`,
    },
    {
      heading: "10. Cambios en estos términos",
      body: `Podemos actualizar estos términos. Cada cambio se publica como una versión nueva con su fecha, y la app te pedirá aceptarla para continuar usando tu cuenta. Si no la aceptas, puedes cerrar sesión y seguir como invitado, o eliminar tu cuenta.`,
    },
    {
      heading: "11. Ley aplicable",
      body: `Estos términos se rigen por la legislación de la República del Ecuador, incluidas, en lo que corresponda, la Ley Orgánica de Defensa del Consumidor y la Ley de Comercio Electrónico.`,
    },
  ],
};
