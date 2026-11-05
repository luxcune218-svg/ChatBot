import mongoose from 'mongoose';

export const CATEGORIES = [
  'recibo_pago',
  'saldo_bolsas',
  'internet_llamadas',
  'chip_esim',
  'portabilidad',
  'equipo',
  'reclamo',
  'otro'
];

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    userMessage: {
      type: String,
      required: [true, 'El mensaje del usuario es obligatorio'],
      trim: true
    },
    aiReply: {
      type: String,
      required: [true, 'La respuesta de la IA es obligatoria'],
      trim: true
    },
    category: {
      type: String,
      enum: {
        values: CATEGORIES,
        message: 'Categoría no válida: {VALUE}'
      },
      default: 'otro'
    },
    summary: {
      type: String,
      trim: true,
      default: ''
    },
    suggestedSteps: {
      type: [String],
      default: []
    },
    requiresHuman: {
      type: Boolean,
      default: false,
      index: true
    },
    metadata: {
      model: {
        type: String,
        default: 'gemini-2.5-flash'
      },
      ip: String,
      userAgent: String
    }
  },
  {
    timestamps: true
  }
);

// Índice compuesto para consultas rápidas por usuario y fecha
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ category: 1, createdAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;

