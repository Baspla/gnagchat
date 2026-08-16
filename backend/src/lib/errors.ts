/**
 * Typed domain errors for the backend.
 *
 * Each error carries a `statusCode` for the HTTP response and a `code`
 * string for programmatic identification on the client.
 */

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: unknown;
    public readonly cause?: Error;

    constructor(
        statusCode: number,
        code: string,
        message: string,
        options?: { details?: unknown; cause?: Error },
    ) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = options?.details;
        this.cause = options?.cause;
    }
}

export class BadRequestError extends AppError {
    constructor(message: string, options?: { details?: unknown; cause?: Error }) {
        super(400, "BAD_REQUEST", message, options);
        this.name = "BadRequestError";
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string, options?: { details?: unknown; cause?: Error }) {
        super(401, "UNAUTHORIZED", message, options);
        this.name = "UnauthorizedError";
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string, options?: { details?: unknown; cause?: Error }) {
        super(403, "FORBIDDEN", message, options);
        this.name = "ForbiddenError";
    }
}

export class NotFoundError extends AppError {
    constructor(message: string, options?: { details?: unknown; cause?: Error }) {
        super(404, "NOT_FOUND", message, options);
        this.name = "NotFoundError";
    }
}

export class ConflictError extends AppError {
    constructor(message: string, options?: { details?: unknown; cause?: Error }) {
        super(409, "CONFLICT", message, options);
        this.name = "ConflictError";
    }
}

export class InternalError extends AppError {
    constructor(message: string, options?: { details?: unknown; cause?: Error }) {
        super(500, "INTERNAL_ERROR", message, options);
        this.name = "InternalError";
    }
}

/**
 * Type guard to check if a value is an AppError.
 */
export function isAppError(err: unknown): err is AppError {
    return err instanceof AppError;
}

/**
 * Shared error response body sent to the client.
 */
export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

/**
 * Build a safe error response body.
 * Never leaks internal details for non-AppError exceptions.
 */
export function toErrorResponse(err: unknown): ApiErrorResponse {
    if (isAppError(err)) {
        return {
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
        };
    }
    // Unknown error — do not leak message or stack
    return {
        error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
        },
    };
}