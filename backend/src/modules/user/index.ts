// modules/user/index.ts
import { Elysia, t } from 'elysia'
import { UserService } from './service'
import { Modules } from '../../../../shared/constants'
import { authMiddleware } from '../auth'

export const userModule = new Elysia({ prefix: '/users', name: Modules.USERS })
    .use(authMiddleware)
    .derive({ as: 'scoped' }, () => ({
        userService: new UserService()
    }))
    .get('/me', async ({ user, status, userService }) => {
        try {
            return await userService.getUserForUser(user.id, user.id)
        } catch (e) {
            return status('Not Found', "User profile not found")
        }
    }, { auth: true })
    .get('/:id', async ({ user,params, status, userService }) => {
        try {
            return await userService.getUserForUser(user.id, params.id)
        } catch (e) {
            return status('Not Found', "User profile not found")
        }
    }, { auth: true })