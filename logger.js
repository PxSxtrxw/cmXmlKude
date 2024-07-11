const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const path = require('path');

// Formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} - ${level.toUpperCase()} - ${message}`;
});

// Configuración de los loggers para info y error
const logger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    logFormat
  ),
  transports: [
    // Log de información en consola y en archivo info.log
    new transports.Console(),
    new transports.File({ filename: path.join(__dirname, 'logs', 'eventLogger.log'), level: 'info' }),
  ],
});

// Logger para errores
const errorLogger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    logFormat
  ),
  transports: [
    // Log de errores en consola y en archivo error.log
    new transports.Console(),
    new transports.File({ filename: path.join(__dirname, 'logs', 'errorlogger.log'), level: 'error' }),
  ],
});

module.exports = { logger, errorLogger };
