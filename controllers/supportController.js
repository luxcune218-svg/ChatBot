import Conversation from '../models/Conversation.js';
import * as geminiService from '../services/geminiService.js';

/**
 * Procesa un mensaje de soporte al cliente con Gemini 2.5 Flash
 * y almacena el registro en MongoDB.
 *
 * @route POST /api/support/chat
 */
export const handleChat = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El campo "message" es obligatorio y no puede estar vacío.'
      });
    }

    const trimmedMessage = message.trim();

    // 1. Procesar la consulta con Gemini 2.5 Flash
    const aiResult = await geminiService.generateSupportResponse(
      trimmedMessage,
      Array.isArray(history) ? history : []
    );

    // 2. Persistir automáticamente en la colección Conversations de MongoDB
    let savedConversation = null;
    try {
      savedConversation = await Conversation.create({
        userId: req.user?._id || null,
        userMessage: trimmedMessage,
        aiReply: aiResult.reply,
        category: aiResult.category,
        summary: aiResult.summary,
        suggestedSteps: aiResult.suggestedSteps,
        requiresHuman: aiResult.requiresHuman,
        metadata: {
          model: 'gemini-2.5-flash',
          ip: req.ip || req.headers['x-forwarded-for'] || '',
          userAgent: req.headers['user-agent'] || ''
        }
      });
    } catch (dbError) {
      // Si la base de datos está desconectada, informamos por consola pero no interrumpimos la respuesta al cliente
      console.warn('⚠️ No se pudo guardar la conversación en MongoDB (verificar conexión):', dbError.message);
    }

    // 3. Responder al cliente con la estructura completa
    return res.status(200).json({
      success: true,
      data: {
        id: savedConversation ? savedConversation._id : null,
        reply: aiResult.reply,
        category: aiResult.category,
        summary: aiResult.summary,
        suggestedSteps: aiResult.suggestedSteps,
        requiresHuman: aiResult.requiresHuman,
        createdAt: savedConversation ? savedConversation.createdAt : new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el historial de conversaciones recientes
 * @route GET /api/support/history
 */
export const getChatHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const { category, requiresHuman } = req.query;

    const filter = {};

    // Si el usuario está autenticado y no es admin, solo ve sus conversaciones
    if (req.user) {
      if (req.user.role !== 'admin' && req.user.role !== 'advisor') {
        filter.userId = req.user._id;
      }
    }

    if (category) {
      filter.category = category;
    }

    if (requiresHuman !== undefined) {
      filter.requiresHuman = requiresHuman === 'true';
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email')
        .lean(),
      Conversation.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        conversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retorna preguntas frecuentes y acciones rápidas sugeridas de Entel Perú
 * @route GET /api/support/faqs
 */
export const getQuickFaqs = (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      {
        id: 'faq-1',
        title: 'Planes Entel Power',
        prompt: '¿Cuáles son los planes Entel Power disponibles y qué beneficios incluyen?',
        category: 'internet_llamadas'
      },
      {
        id: 'faq-2',
        title: 'Consulta de Saldo y Bolsas',
        prompt: '¿Cómo puedo consultar mi saldo y comprar bolsas de datos marcando *144#?',
        category: 'saldo_bolsas'
      },
      {
        id: 'faq-3',
        title: 'Pagar mi Recibo',
        prompt: '¿Cómo y dónde puedo pagar mi recibo Entel desde la app o por internet?',
        category: 'recibo_pago'
      },
      {
        id: 'faq-4',
        title: 'Migración a eSIM',
        prompt: '¿Cómo puedo cambiar mi chip físico por una eSIM digital en Entel Perú?',
        category: 'chip_esim'
      },
      {
        id: 'faq-5',
        title: 'Portabilidad a Entel',
        prompt: 'Quiero cambiarme a Entel manteniendo mi mismo número, ¿cuál es el proceso?',
        category: 'portabilidad'
      },
      {
        id: 'faq-6',
        title: 'Hablar con un Asesor',
        prompt: 'Necesito atención urgente y hablar directamente con un asesor humano por favor.',
        category: 'reclamo'
      }
    ]
  });
};

