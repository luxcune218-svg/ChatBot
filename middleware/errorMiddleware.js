/**
 * Middleware para rutas no encontradas (404)
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Middleware global de manejo de errores
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Error interno del servidor';

  // Manejo de error de ObjectId inválido de Mongoose
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Recurso no encontrado. Identificador con formato inválido.';
  }

  // Manejo de error de clave duplicada en MongoDB (ej. email único)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    message = `Ya existe un registro con ese ${field}.`;
  }

  // Manejo de error de validación de Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Manejo de error específico de JSON Web Token
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token de autenticación no válido.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'El token de autenticación ha expirado.';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

