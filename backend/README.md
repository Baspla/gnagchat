# GnagChat Backend

Elysia + Bun runtime for the GnagChat backend.

## Getting Started

Install dependencies and run the dev server:

```bash
bun install
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.

## Configuration

Copy `.example.env` to `.env` and adjust values:

```bash
cp .example.env .env
```

## Logging

The backend uses a structured JSON logger (`backend/src/lib/logger.ts`). Every log line contains `level`, `scope`, `time`, and `msg`, with an optional `data` field.

Configure the minimum log level via the `GNAGCHAT_LOG_LEVEL` environment variable (default: `info`):

| Value   | Includes                                                  |
| ------- | --------------------------------------------------------- |
| `error` | Errors only                                               |
| `warn`  | Errors + warnings                                         |
| `info`  | Errors + warnings + informational messages (default)      |
| `debug` | Everything, including request paths and API payload dumps |

## Errors

Services throw typed errors from `backend/src/lib/errors.ts` (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `InternalError`). A central `onError` handler in `src/index.ts` maps them to HTTP status codes and consistently formats responses as:

```json
{ "error": { "code": "NOT_FOUND", "message": "Room not found" } }
```

Unknown errors are logged with a full stack and return a generic `500` response without leaking internals.

## Scripts

| Script            | Description                                  |
| ----------------- | -------------------------------------------- |
| `bun run dev`     | Start the development server with watch mode |
| `bun run start`   | Start the production server                  |
| `db:generate`     | Generate Drizzle migrations                  |
| `db:migrate`      | Apply Drizzle migrations                     |
| `db:studio`       | Open Drizzle Studio                          |
| `db:checkpoint`   | Checkpoint and close the SQLite WAL          |