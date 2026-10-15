import { describe, expect, it } from 'bun:test';
import { treaty } from '@elysiajs/eden';
import { Elysia } from 'elysia';

type SessionPayload = {
    user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        emailVerified: boolean;
        groups: string;
        image?: string | null;
    };
    session: { id: string };
};

import { setTestSession } from './test/setup';
const { authMiddleware } = await import('./modules/auth');
const { app } = await import('./index');

const api = treaty(app).api.v1;
const groupProtectedApp = new Elysia()
    .use(authMiddleware)
    .get('/admin', ({ user }) => ({ userId: user.id }), { groups: ['admin'] });

describe('Backend API', () => {
    it('serves the health endpoint through Eden Treaty without opening a network listener', async () => {
        const { data, response } = await api.health.get();

        expect(response.status).toBe(200);
        expect(data).toEqual({ status: 'ok' });
    });

    it('serves the public status endpoint', async () => {
        const { data, response } = await api.status.get();

        expect(response.status).toBe(200);
        expect(data).toEqual({ status: 'online' });
    });

    it('rejects requests to protected routes without an authenticated session', async () => {
        setTestSession(null);
        const { response } = await api.chat.channels.get();

        expect(response.status).toBe(401);
    });

    it('allows an authenticated request to reach its protected route', async () => {
        setTestSession({
            user: {
                id: 'test-user',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                name: 'Test User',
                email: 'test-user@example.test',
                emailVerified: true,
                groups: '[]',
                image: null,
            },
            session: { id: 'test-session' },
        });

        const { data, response } = await api.chat.channels.get();

        expect(response.status).toBe(200);
        expect(data).toEqual([]);
        setTestSession(null);
    });

    it('returns the API validation error shape for invalid request bodies', async () => {
        setTestSession({
            user: {
                id: 'test-user',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                name: 'Test User',
                email: 'test-user@example.test',
                emailVerified: true,
                groups: '[]',
            },
            session: { id: 'test-session' },
        });

        const response = await app.handle(new Request('http://localhost/api/v1/chat/channels', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'x' }),
        }));

        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
            error: { code: 'VALIDATION', message: 'Validation failed' },
        });
        setTestSession(null);
    });

    it('maps forbidden chat service results to HTTP 403 responses', async () => {
        setTestSession({
            user: {
                id: 'test-outsider',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                name: 'Test Outsider',
                email: 'test-outsider@example.test',
                emailVerified: true,
                groups: '[]',
            },
            session: { id: 'test-session' },
        });

        const response = await app.handle(new Request('http://localhost/api/v1/chat/rooms/nonexistent-room/history'));

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({
            error: { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this room' },
        });
        setTestSession(null);
    });

    it('allows only users with an allowed group through the group authorization macro', async () => {
        const session: SessionPayload = {
            user: {
                id: 'group-user',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                name: 'Group User',
                email: 'group-user@example.test',
                emailVerified: true,
                groups: '["admin"]',
            },
            session: { id: 'group-session' },
        };
        setTestSession(session);

        const allowed = await groupProtectedApp.handle(new Request('http://localhost/admin'));
        expect(allowed.status).toBe(200);
        expect(await allowed.json()).toEqual({ userId: 'group-user' });

        session.user.groups = '["member"]';
        const forbidden = await groupProtectedApp.handle(new Request('http://localhost/admin'));
        expect(forbidden.status).toBe(403);

        session.user.groups = 'not-json';
        const malformedGroups = await groupProtectedApp.handle(new Request('http://localhost/admin'));
        expect(malformedGroups.status).toBe(403);
        setTestSession(null);
    });

    it('returns a consistent not-found response for unknown paths', async () => {
        const response = await app.handle(new Request('http://localhost/api/v1/missing'));

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: { code: 'NOT_FOUND', message: 'Not found' },
        });
    });
});