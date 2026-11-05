import dotenv from 'dotenv';
// Cargar variables de entorno antes de importar otros módulos
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 3000;

// Iniciar conexión a MongoDB e inicializar servidor Express
const startServer = async () => {
  console.log('====================================================');
  console.log('   🚀 INICIANDO CHATBOT SOPORTE - ENTEL PERÚ 🇵🇪     ');
  console.log('====================================================');

  // Conectar a MongoDB
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`📡 Servidor escuchando en: http://localhost:${PORT}`);
    console.log(`🌐 Interfaz Web Entel:     http://localhost:${PORT}/`);
    console.log(`🤖 Endpoint de Chat:      POST http://localhost:${PORT}/api/support/chat`);
    console.log(`🩺 Health Check:          GET  http://localhost:${PORT}/api/health`);
    console.log('====================================================');
  });

  // Manejo de apagado elegante (Graceful Shutdown)
  const shutdown = (signal) => {
    console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor de forma segura...`);
    server.close(() => {
      console.log('👋 Servidor HTTP cerrado.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Manejo de excepciones no capturadas
  process.on('unhandledRejection', (err) => {
    console.error('💥 Error no controlado (unhandledRejection):', err.message);
  });
};

startServer();

