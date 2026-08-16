type LogLevel = "error" | "warn" | "info" | "debug";

const LEVELS: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

export function getConfiguredLevel(): LogLevel {
    // Explicit env override takes precedence
    const fromEnv = import.meta.env?.PUBLIC_GNAGCHAT_LOG_LEVEL as LogLevel | undefined;
    if (fromEnv && LEVELS[fromEnv] !== undefined) {
        return fromEnv;
    }
    // In dev mode default to info, otherwise warn
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
        return "info";
    }
    return "warn";
}

const currentThreshold = LEVELS[getConfiguredLevel()] ?? LEVELS.warn;

function isEnabled(level: LogLevel): boolean {
    return LEVELS[level] <= currentThreshold;
}

const COLORS: Record<LogLevel, string> = {
    error: "color: #ef4444; font-weight: bold",
    warn: "color: #f59e0b; font-weight: bold",
    info: "color: #3b82f6",
    debug: "color: #6b7280",
};

export interface Logger {
    error(msg: string, data?: unknown): void;
    warn(msg: string, data?: unknown): void;
    info(msg: string, data?: unknown): void;
    debug(msg: string, data?: unknown): void;
}

export function createLogger(scope: string): Logger {
    const log = (level: LogLevel, msg: string, data?: unknown) => {
        if (!isEnabled(level)) return;
        const prefix = `[${scope}]`;
        const style = COLORS[level];
        const fn = level === "debug" ? console.log : console[level];
        if (data !== undefined) {
            fn(`%c${prefix} ${msg}`, style, data);
        } else {
            fn(`%c${prefix} ${msg}`, style);
        }
    };

    return {
        error: (msg, data?) => log("error", msg, data),
        warn: (msg, data?) => log("warn", msg, data),
        info: (msg, data?) => log("info", msg, data),
        debug: (msg, data?) => log("debug", msg, data),
    };
}