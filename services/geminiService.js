import { GoogleGenAI, Type } from '@google/genai';

/**
 * Prompt del Sistema especializado para el Asistente Oficial de Entel Perú
 */
const ENTEL_SYSTEM_INSTRUCTION = `
Eres el Asistente Virtual Oficial de Entel Perú, una de las empresas de telecomunicaciones líderes en Perú.
Tu misión es brindar atención al cliente de primer nivel: de manera ágil, empática, cortés, precisa y resolutiva.

### CONOCIMIENTO DE SERVICIOS Y PRODUCTOS ENTEL PERÚ:
1. **Planes Postpago (Entel Power)**:
   - Plan Entel Power S/ 29.90: Datos de alta velocidad, minutos ilimitados a todo el Perú, SMS libres, WhatsApp y redes sociales incluidas.
   - Plan Entel Power S/ 39.90: Paquete ampliado de gigas de alta velocidad, Roaming en países seleccionados, apps ilimitadas y consumo optimizado.
   - Plan Entel Power S/ 49.90 y S/ 69.90: Gigas en alta velocidad con política de uso justo, minutos ilimitados a todo destino nacional, Estados Unidos y Canadá, y beneficios premium en la App Mi Entel.
2. **Servicios Prepago y Recargas**:
   - Recargas desde S/ 5 con bonos y combos Power.
   - Puntos de recarga: App Mi Entel, web entel.pe, billeteras digitales (Yape, Plin), agentes autorizados y bancos (BCP, BBVA, Interbank, Scotiabank).
3. **Canales de Autoservicio**:
   - Marcación USSD rápida: Marca *144# para consultar saldo de gigas y minutos, comprar bolsas de datos y consultar fecha de vencimiento sin costo.
   - App Mi Entel Perú (Android / iOS): Ver consumo en tiempo real, descargar recibos detallados en PDF, pagar facturas con tarjeta débito/crédito o Yape, y gestionar líneas adicionales.
   - Portal Web: www.entel.pe.
   - WhatsApp Oficial de Soporte Entel Perú: +51 994 860 000 (disponible 24 horas).
   - Teléfono de atención: Marca 123 desde tu celular Entel o al (01) 611-7777 desde cualquier operador.
4. **Chip y eSIM Digital**:
   - Adquisición o reposición de chip en tiendas y centros de atención a nivel nacional presentando DNI/CE vigente.
   - Activación de eSIM 100% digital desde la App Mi Entel en dispositivos móviles compatibles.
5. **Portabilidad**:
   - Trámite 100% digital a través de entel.pe/portabilidad con delivery de chip a domicilio sin costo o activación inmediata vía eSIM.

### REGLA CRÍTICA PARA 'requiresHuman':
- 'requiresHuman' DEBE SER TRUE ÚNICAMENTE EN ESTOS 3 CASOS:
  1. El cliente exige hablar con un asesor o representante humano ("quiero un humano", "pásame con un asesor", "asesor ya").
  2. El cliente solicita formalmente cancelar la línea, dar de baja el servicio o rescindir el contrato.
  3. El cliente formula un reclamo por cobro excesivo, facturación indebida o cobro no reconocido en su recibo.
- Para cualquier otra consulta (información de planes, cómo pagar, compras de bolsas, saldo, configuración APN, dudas generales), 'requiresHuman' DEBE SER FALSE.

### FORMATO DE RESPUESTA:
- Debes responder SIEMPRE en formato JSON estructurado siguiendo el esquema proporcionado.
- Tu campo 'reply' debe estar escrito en tono amigable, profesional, con tuteo respetuoso característico de Entel Perú, usando formato claro (viñetas si aplica).
- 'suggestedSteps' debe ser una lista de 2 a 4 pasos prácticos y accionables que el cliente puede seguir.
`;

/**
 * Esquema de respuesta estructurada JSON para Gemini
 */
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: [
        'recibo_pago',
        'saldo_bolsas',
        'internet_llamadas',
        'chip_esim',
        'portabilidad',
        'equipo',
        'reclamo',
        'otro'
      ],
      description: 'Categoría principal de la consulta del cliente'
    },
    summary: {
      type: Type.STRING,
      description: 'Resumen conciso en 1 línea de la consulta y respuesta'
    },
    reply: {
      type: Type.STRING,
      description: 'Respuesta completa, cordial y detallada dirigida al cliente'
    },
    suggestedSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING
      },
      description: 'Acciones inmediatas y sugerencias que el usuario puede ejecutar'
    },
    requiresHuman: {
      type: Type.BOOLEAN,
      description: 'Indica si amerita derivación prioritaria a un asesor humano'
    }
  },
  required: ['category', 'summary', 'reply', 'suggestedSteps', 'requiresHuman']
};

/**
 * Obtiene y limpia la API Key de Gemini
 */
const getCleanApiKey = () => {
  let apiKey = process.env.GEMINI_API_KEY || '';
  // Limpieza defensiva en caso de que se haya pegado "GEMINI_API_KEY=" o comillas en el valor
  apiKey = apiKey
    .replace(/^GEMINI_API_KEY=\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();

  if (!apiKey || apiKey.includes('TU_API_KEY')) {
    throw new Error(
      'La variable GEMINI_API_KEY no está configurada correctamente en el archivo .env.'
    );
  }

  return apiKey;
};

/**
 * Instancia el cliente oficial de Gemini
 */
const getGeminiClient = () => {
  const apiKey = getCleanApiKey();
  return new GoogleGenAI({
    vertexai: false,
    apiKey
  });
};

/**
 * Modelos disponibles con fallback automático
 */
const MODEL_PRIORITY = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash'
].filter(Boolean);

const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Procesa un mensaje del usuario utilizando el modelo Gemini
 * con respuesta estructurada JSON y tolerancia a fallos.
 *
 * @param {string} userMessage - Mensaje enviado por el usuario
 * @param {Array} history - Historial previo de conversación [{role: 'user'|'model', content: string}]
 * @returns {Promise<Object>} Objeto con category, summary, reply, suggestedSteps, requiresHuman
 */
export const generateSupportResponse = async (userMessage, history = []) => {
  const ai = getGeminiClient();

  // Construir contexto conversacional si existe historial previo
  let formattedContents = '';
  if (Array.isArray(history) && history.length > 0) {
    const recentHistory = history.slice(-6);
    const historyText = recentHistory
      .map(
        (h) =>
          `${h.role === 'user' ? 'Cliente' : 'Asistente Entel'}: ${h.content}`
      )
      .join('\n');
    formattedContents = `Historial previo de la conversación:\n${historyText}\n\nNueva consulta del cliente: "${userMessage}"`;
  } else {
    formattedContents = `Consulta del cliente: "${userMessage}"`;
  }

  let lastError = null;

  // Intentar con la lista de modelos priorizados con tolerancia a fallos (404/503)
  for (const modelName of MODEL_PRIORITY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: {
            systemInstruction: ENTEL_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.3
          }
        });

        const rawText = response.text;
        if (!rawText) {
          throw new Error('No se recibió texto de respuesta desde la API de Gemini.');
        }

        const parsedData = JSON.parse(rawText);

        return {
          category: parsedData.category || 'otro',
          summary: parsedData.summary || 'Consulta de soporte Entel',
          reply:
            parsedData.reply ||
            'Hola, ¿en qué podemos ayudarte el día de hoy con tu servicio Entel?',
          suggestedSteps: Array.isArray(parsedData.suggestedSteps)
            ? parsedData.suggestedSteps
            : ['Ingresa a la App Mi Entel', 'Marca *144# para consultas de saldo'],
          requiresHuman: Boolean(parsedData.requiresHuman)
        };
      } catch (error) {
        lastError = error;

        // Si es 503 (alta demanda momentánea), esperar brevemente antes de reintentar
        if (error.status === 503 && attempt === 1) {
          await waitMs(600);
          continue;
        }

        // Si es 404 (modelo retirado o no disponible en esta región/cuenta), saltar inmediatamente al siguiente
        if (error.status === 404 || error.message?.includes('not found') || error.message?.includes('no longer available')) {
          break;
        }

        // Si es error de autenticación (400 / 401), no insistir
        if (error.status === 400 || error.status === 401 || error.message?.includes('API key not valid')) {
          break;
        }
      }
    }

    if (lastError?.status === 400 || lastError?.status === 401 || lastError?.message?.includes('API key not valid')) {
      break;
    }
  }

  // Formatear error amigable
  let readableMessage = 'Error al comunicarse con el servicio de IA de Google Gemini.';

  try {
    const parsed = JSON.parse(lastError.message);
    if (parsed.error && parsed.error.message) {
      if (parsed.error.message.includes('API key not valid')) {
        readableMessage =
          'La API Key de Google Gemini configurada en .env no es válida. Por favor verifica que tu clave esté activa en Google AI Studio.';
      } else {
        readableMessage = parsed.error.message;
      }
    }
  } catch (e) {
    if (lastError?.message?.includes('API key not valid')) {
      readableMessage =
        'La API Key de Google Gemini configurada en .env no es válida. Por favor verifica que tu clave esté activa en Google AI Studio.';
    } else {
      readableMessage = lastError?.message || readableMessage;
    }
  }

  throw new Error(readableMessage);
};
