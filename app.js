import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Seguridad con Helmet (permitiendo recursos estáticos del chat)
app.use(
  helmet({
    contentSecurityPolicy: false, // Permite cargar estilos, fuentes e iconos locales libremente
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS para permitir clientes web y apps externas
app.use(cors());

// 3. Parsers de cuerpo de petición
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. Rate Limiting para prevenir abusos
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 150, // Límite de peticiones generales por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Has superado el límite de solicitudes. Por favor intenta nuevamente en unos minutos.'
  }
});

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // Máximo 30 mensajes por minuto por usuario
  message: {
    success: false,
    error: 'Demasiadas consultas enviadas en poco tiempo. Por favor espera unos segundos.'
  }
});

app.use('/api', apiLimiter);
app.use('/api/support/chat', chatLimiter);

// 5. Servir la interfaz web estática de Entel desde public/
app.use(express.static(path.join(__dirname, 'public')));

// 6. Endpoint de verificación de salud (Health Check)
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    success: true,
    service: 'Entel Perú Customer Support Chatbot API',
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: dbStatusMap[dbState] || 'unknown',
    aiModel: 'gemini-2.5-flash'
  });
});

// 7. Montar rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/support', supportRoutes);

// 8. Manejadores de errores
app.use(notFound);
app.use(errorHandler);

export default app;

