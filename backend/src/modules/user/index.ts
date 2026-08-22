import { Elysia, t } from 'elysia'
import { UserService } from './service'
import { Modules } from '@gnagchat/shared/constants'
import { authMiddleware } from '../auth'

export const userModule = new Elysia({ prefix: '/users', name: Modules.USER })
    .use(authMiddleware)
    .derive({ as: 'scoped' }, () => ({
        userService: UserService
    }))
    .get('/me', async ({ user, userService, status }) => {
        const result = await userService.getUserAsUser(user.id, user.id)
        if (!result.ok) {
            return status(result.error.status, { error: result.error })
        }
        return result.value
    }, { auth: true })
    .get('/:id', async ({ user, params, userService, status }) => {
        const result = await userService.getUserAsUser(user.id, params.id)
        if (!result.ok) {
            return status(result.error.status, { error: result.error })
        }
        return result.value
    }, {
        params: t.Object({
            id: t.String()
        }),
        auth: true
    })