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
 * El orden de las secciones sigue los puntos del art. 12 de la LOPDP.
 */
export const PRIVACY_2026_11_07: LegalDocument = {
  type: "privacy",
  version: "2026-11-07",
  title: "Política de privacidad",
  publishedAt: "2026-11-07",
  sections: [
    {
      heading: "Introducción",
      body: `Esta política explica qué datos personales trata ${LEGAL_APP_NAME}, para qué, por cuánto tiempo y qué derechos tienes. ${LEGAL_APP_NAME} es un proyecto de vinculación de la Carrera de Software de la ${LEGAL_RESPONSIBLE_NAME}, en beneficio de la ciudad de Guaranda.\n\nCumple lo que exigen la Ley Orgánica de Protección de Datos Personales (Registro Oficial, Quinto Suplemento 459, 26 de mayo de 2021), en especial sus artículos 8 y 12; su Reglamento General (Decreto Ejecutivo 904, Registro Oficial, Tercer Suplemento 435, 13 de noviembre de 2023); y la Resolución SPDP-SPD-2026-0009-R (Registro Oficial 240, 10 de marzo de 2026), que obliga a informar el tratamiento mediante sistemas de inteligencia artificial, sus finalidades y su carácter automatizado.`,
    },
    {
      heading: "1. Finalidades del tratamiento",
      body: `Tratamos tus datos para:\n\nCrear y mantener tu cuenta, iniciar sesión y proteger el acceso.\n\nMostrarte el mapa, calcular rutas y guiarte durante la navegación.\n\nPublicar y moderar tus opiniones y calificaciones.\n\nGuardar tus favoritos y los itinerarios que hayas guardado antes en la app.\n\nResponder tus consultas al asistente con inteligencia artificial y diagnosticar sus fallos.\n\nDetectar y corregir errores de la app.\n\nProbar que aceptaste los documentos legales.`,
    },
    {
      heading: "2. Base legal",
      body: `La base legal es tu consentimiento, que entregas al aceptar esta política, de forma libre, específica, informada e inequívoca, conforme al artículo 8 de la Ley Orgánica de Protección de Datos Personales.\n\nEl permiso de ubicación es aparte: lo das o lo niegas en tu dispositivo cuando activas una función que lo necesita.`,
    },
    {
      heading: "3. Tipos de tratamiento",
      body: `Recogemos, registramos, organizamos, consultamos, usamos, conservamos y eliminamos datos personales. Estos son los datos que tratamos:\n\nDatos de la cuenta: nombre, correo electrónico, género y fecha de nacimiento. La contraseña se guarda solo como hash, nunca en texto legible.\n\nSesiones: registros técnicos que mantienen tu sesión iniciada.\n\nUbicación: se usa para el mapa, las rutas y la navegación, incluso en segundo plano mientras una navegación está activa. El cálculo de rutas y la búsqueda de direcciones se realizan en servicios propios del proyecto. No guardamos un historial de tus trayectos.\n\nOpiniones y calificaciones: su contenido y su estado de moderación.\n\nFavoritos e itinerarios guardados.\n\nConsultas al asistente: el texto de tus preguntas, sus respuestas y los registros técnicos de cada turno.\n\nVoz: si dictas una pregunta, el audio se envía para su transcripción.\n\nConstancias de aceptación: documento, versión, fecha y hora, y la versión de la app que declaraste.\n\nReportes de error: cuando el servicio está configurado, la app envía a Sentry reportes anónimos de fallos. Antes de enviarlos elimina coordenadas, correos, tokens y otros datos sensibles.`,
    },
    {
      heading: "4. Tiempo de conservación",
      body: `Datos de la cuenta, favoritos e itinerarios: hasta que elimines tu cuenta.\n\nOpiniones: hasta que elimines tu cuenta o una moderación las retire. Al eliminar la cuenta dejan de mostrarse y su texto se borra, incluidas las versiones anteriores.\n\nConsultas al asistente: cada turno se guarda hasta 30 días aunque no hayas activado el historial. Si activas el historial, tus conversaciones se conservan hasta que lo desactives o elimines tu cuenta.\n\nAudio de voz: se mantiene solo en memoria durante la solicitud; no se guarda.\n\nConstancias de aceptación: las conservamos después de eliminar la cuenta, sin otros datos personales, como prueba de tu consentimiento.`,
    },
    {
      heading: "5. Existencia de una base de datos",
      body: `Tus datos se guardan en una base de datos de ${LEGAL_APP_NAME}, a cargo de la ${LEGAL_RESPONSIBLE_NAME}.`,
    },
    {
      heading: "6. Origen de los datos",
      body: `El origen de los datos eres tú: los entregas al registrarte y al usar la app. La ubicación proviene de tu dispositivo cuando das el permiso. No compramos ni recibimos tus datos de terceros.`,
    },
    {
      heading: "7. Otras finalidades y tratamientos ulteriores",
      body: `No usamos tus datos para otras finalidades distintas de las indicadas. La app no incluye publicidad ni analítica de comportamiento. Si quisiéramos usarlos para otro fin, te lo informaremos y pediremos tu consentimiento cuando corresponda.`,
    },
    {
      heading: "8. Responsable del tratamiento",
      body: `Responsable: ${LEGAL_RESPONSIBLE_NAME}.\n\nDirección: ${LEGAL_RESPONSIBLE_ADDRESS}.\n\nTeléfono: ${LEGAL_RESPONSIBLE_PHONE}.\n\nCorreo electrónico: ${LEGAL_CONTACT_EMAIL}.`,
    },
    {
      heading: "9. Delegado de protección de datos",
      body: `Para cualquier asunto sobre protección de datos, incluida la comunicación con el delegado de protección de datos cuando corresponda, usa los canales del responsable indicados en el punto anterior.`,
    },
    {
      heading: "10. Transferencias nacionales e internacionales",
      body: `Transferencias internacionales:\n\nProveedor de inteligencia artificial, en el exterior: Anthropic u OpenAI, según la configuración del servicio. Finalidad: generar las respuestas del asistente. Recibe el texto de tu consulta y parte de la conversación en curso. Si compartes tu ubicación con el asistente, recibe coordenadas redondeadas a 3 decimales. Garantías: no le enviamos tu correo, tu fecha de nacimiento ni tus credenciales.\n\nOpenAI, en el exterior. Finalidad: transcribir las preguntas dictadas por voz. Recibe el audio de tu pregunta. Garantías: el audio se mantiene solo en memoria durante la solicitud y no lo guardamos.\n\nSentry, en el exterior, cuando el servicio está configurado. Finalidad: detectar fallos de la app. Recibe reportes anónimos. Garantías: antes de enviarlos se eliminan coordenadas, correos, tokens y cuerpos de solicitudes.\n\nTransferencias nacionales: no comunicamos tus datos a otras entidades en Ecuador, salvo que una autoridad competente lo exija conforme a la ley.`,
    },
    {
      heading: "11. Consecuencias de entregar o negar tus datos",
      body: `Tus datos de cuenta y la aceptación de esta política son necesarios para crear una cuenta. Si no los entregas, no podrás registrarte, pero podrás explorar como invitado. Debes tener al menos ${LEGAL_MINIMUM_AGE} años para registrarte: quien tiene menos de ${LEGAL_MINIMUM_AGE} años no puede crear una cuenta.\n\nSi niegas el permiso de ubicación, el mapa sigue disponible, pero no funcionarán las funciones que dependen de tu posición, como la navegación.\n\nEl asistente requiere una cuenta. Si no quieres que tus consultas se traten como aquí se explica, no lo uses.`,
    },
    {
      heading: "12. Efecto de entregar datos inexactos",
      body: `Si entregas datos inexactos, podrías no poder acceder a tu cuenta o recibir un servicio incorrecto. Declarar una fecha de nacimiento falsa incumple los Términos y condiciones.`,
    },
    {
      heading: "13. Derecho a revocar tu consentimiento",
      body: `Puedes revocar tu consentimiento en cualquier momento, de forma gratuita y sin dar explicaciones. La vía más directa es eliminar tu cuenta en la app, en Perfil. También puedes escribir a ${LEGAL_CONTACT_EMAIL}.\n\nLa revocación no afecta al tratamiento realizado antes de ella. Al eliminar la cuenta se borran tu nombre, correo, género, fecha de nacimiento y contraseña, tus favoritos, itinerarios, historial y turnos del asistente, y tus sesiones. Tus opiniones dejan de mostrarse y su texto se borra. Las constancias de aceptación se conservan como prueba.`,
    },
    {
      heading: "14. Tus derechos",
      body: `Tienes derecho de acceso, eliminación, rectificación y actualización, oposición, anulación, limitación del tratamiento y a no ser objeto de una decisión basada únicamente en valoraciones automatizadas.\n\nPara ejercerlos, escribe a ${LEGAL_CONTACT_EMAIL} o acude a ${LEGAL_RESPONSIBLE_ADDRESS}. La eliminación de tu cuenta también está disponible en la app, en Perfil.`,
    },
    {
      heading: "15. Portabilidad",
      body: `Puedes pedir la portabilidad de tus datos a través de los canales del responsable. La app no ofrece por ahora una exportación automática, de modo que la solicitud se atiende a pedido.`,
    },
    {
      heading: "16. Cómo y dónde reclamar",
      body: `Si consideras que no se respetaron tus derechos, primero puedes reclamar ante el responsable: escribe a ${LEGAL_CONTACT_EMAIL}, llama al ${LEGAL_RESPONSIBLE_PHONE} o acude a ${LEGAL_RESPONSIBLE_ADDRESS}.\n\nTambién puedes presentar un reclamo ante la Superintendencia de Protección de Datos Personales.`,
    },
    {
      heading: "17. Decisiones automatizadas y elaboración de perfiles",
      body: `El asistente de la app funciona con inteligencia artificial: sus respuestas se generan de forma automatizada, a partir de tu consulta y del contenido turístico publicado. Su finalidad es orientarte en tu visita.\n\nEl asistente puede equivocarse. Sus recomendaciones son informativas y no sustituyen tu propio criterio; revisa la información antes de tomar una decisión.\n\nNo tomamos decisiones con efectos jurídicos sobre ti basadas únicamente en un tratamiento automatizado, y no elaboramos perfiles tuyos. Las opiniones las revisa una persona.`,
    },
    {
      heading: "Cambios en esta política",
      body: `Si esta política cambia, publicaremos una versión nueva con su fecha y la app te pedirá aceptarla para continuar usando tu cuenta.`,
    },
  ],
};
