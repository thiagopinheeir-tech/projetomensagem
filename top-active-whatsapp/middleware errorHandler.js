export function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.details || err.message
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Database errors
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists'
    });
  }

  if (err.code === '23503') {
    return res.status(409).json({
      success: false,
      message: 'Invalid foreign key reference'
    });
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File size too large'
    });
  }

  // Default server error
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
}
