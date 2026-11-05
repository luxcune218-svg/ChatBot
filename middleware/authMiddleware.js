import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware para proteger rutas que requieren autenticación obligatoria
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'entel_default_secret_key'
      );

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no encontrado. Token inválido.'
        });
      }

      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado. Token inválido o expirado.',
        details: error.message
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Acceso denegado. No se proporcionó un token de autorización Bearer.'
    });
  }
};

/**
 * Middleware opcional: si hay token lo decodifica y asigna req.user,
 * si no hay token continúa como usuario invitado sin bloquear la petición.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'entel_default_secret_key'
      );
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (error) {
    // Si el token es inválido en modo opcional, simplemente lo tratamos como invitado
    req.user = null;
  }
  next();
};

