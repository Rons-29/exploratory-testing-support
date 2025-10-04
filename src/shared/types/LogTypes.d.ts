export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    LOG = "log",
    DEBUG = "debug"
}
export interface LogData {
    id: string;
    level: LogLevel;
    message: string;
    args: string[];
    timestamp: string;
    url: string;
    stack?: string;
    metadata?: LogMetadata;
}
export interface LogMetadata {
    type: 'console' | 'network' | 'error';
    method?: string;
    status?: number;
    duration?: number;
    success?: boolean;
    filename?: string;
    lineno?: number;
    colno?: number;
    stack?: string;
    [key: string]: any;
}
export interface NetworkLogData {
    method: string;
    url: string;
    status: number;
    statusText: string;
    duration: number;
    success: boolean;
    error?: string;
}
export interface ErrorLogData {
    message: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    stack?: string;
    type: string;
}
//# sourceMappingURL=LogTypes.d.ts.map