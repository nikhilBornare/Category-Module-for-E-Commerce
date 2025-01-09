import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, errors, colorize } = format;

// Custom log format
const customFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

// Create Winston logger
const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }), // Ensure stack traces are included for error logs
        customFormat
    ),
    transports: [
        // Console log transport with colors
        new transports.Console({
            format: combine(colorize(), customFormat),
        }),

        // File transport for general logs
        new transports.File({
            filename: 'logs/application.log',
            level: 'info',
        }),

        // File transport for error logs
        new transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
    ],
});

export default logger;
