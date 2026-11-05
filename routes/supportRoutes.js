import { Router } from 'express';
import {
  handleChat,
  getChatHistory,
  getQuickFaqs
} from '../controllers/supportController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Endpoint principal del chat con IA
router.post('/chat', optionalAuth, handleChat);

// Endpoint para consultar historial
router.get('/history', optionalAuth, getChatHistory);

// Preguntas frecuentes y accesos rápidos
router.get('/faqs', getQuickFaqs);

export default router;

