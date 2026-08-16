import { Elysia, t } from 'elysia'
import { UserService } from './service'
import { Modules } from '@gnagchat/shared/constants'
import { authMiddleware } from '../auth'

export const userModule = new Elysia({ prefix: '/users', name: Modules.USER })
    .use(authMiddleware)
    .derive({ as: 'scoped' }, () => ({
        userService: UserService
    }))
    .get('/me', async ({ user, userService }) => {
        return await userService.getUserAsUser(user.id, user.id)
    }, { auth: true })
    .get('/:id', async ({ user, params, userService }) => {
        return await userService.getUserAsUser(user.id, params.id)
    }, { auth: true })
