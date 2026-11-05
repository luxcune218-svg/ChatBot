import app from '../app.js';
import { connectDB } from '../config/db.js';

/**
 * Serverless Function Handler para despliegue en Vercel
 */
export default async function handler(req, res) {
  // Asegurar conexión a MongoDB en cada invocación serverless
  await connectDB();
  return app(req, res);
}

