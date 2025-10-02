import winston from 'winston';

export class Logger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'exploratory-testing-support' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // 本番環境ではファイルにもログを出力
    if (process.env.NODE_ENV === 'production') {
      this.logger.add(new winston.transports.File({
        filename: process.env.LOG_FILE || 'logs/error.log',
        level: 'error'
      }));

      this.logger.add(new winston.transports.File({
        filename: process.env.LOG_FILE || 'logs/combined.log'
      }));
    }
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public error(message: string, error?: any): void {
    this.logger.error(message, error);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }
}
