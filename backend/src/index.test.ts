// test/index.test.ts
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { treaty } from '@elysiajs/eden'

type SessionPayload = {
    user: {
        id: string
        createdAt: Date
        updatedAt: Date
        name: string
        email: string
        emailVerified: boolean
        groups: string
        image?: string | null
    }
    session: {
        id: string
    }
}

let mockedSession: SessionPayload | null = null
const getSessionMock = mock(async () => mockedSession)

mock.module('./auth', () => ({
    auth: {
        handler: async () => new Response('mocked better-auth handler'),
        api: {
            getSession: getSessionMock
        }
    }
}))

const { app } = await import('./index')
const api = treaty(app).api.v1

describe('Backend', () => {
    beforeEach(() => {
        getSessionMock.mockClear()
    })
    describe('Unauthorized Access', () => {
        beforeEach(() => {
            mockedSession = null
        })

        it('returns "ok" for /health', async () => {
            const { data, response } = await api.health.get()
            expect(response.status).toBe(200)
            expect(data).toEqual({ status: 'ok' })
        })
    })
    describe('Authorized Access', () => {
        const mockUser = {
            id: 'max-mustermann',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            name: 'Max Mustermann',
            email: 'mustermann.m@example.com',
            emailVerified: true,
            groups: '[]',
            image: "https://example.com/avatar.png"
        }

        // This runs before every "it" block inside this describe
        beforeEach(() => {
            mockedSession = {
                user: mockUser,
                session: { id: 'session-1' }
            }
        })


        it('returns 200 for non-protected routes', async () => {
            const { response } = await api.status.get()
            expect(response.status).toBe(200)
        })

    })
})