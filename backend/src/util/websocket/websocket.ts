/**
 * Wraps Bun's server.publish with JSON serialization.
 * This ensures objects are properly stringified before being sent to clients.
 */
export function publish(server: Bun.Server<unknown>, topic: string, data: unknown): void {
    server.publish(topic, JSON.stringify(data));
}