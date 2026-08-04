import { db } from '../../db'
import { RedactedUser, User, user } from '../../db/schema'
import { eq } from 'drizzle-orm'

export abstract class UserService {
    static async getUserById (id: string) : Promise<User> {
        const [userData] = await db
            .select()
            .from(user)
            .where(eq(user.id, id))
            .limit(1)

        if (!userData) throw new Error('User not found')
        return userData
    }

    static async getRedactedUserById (id: string) : Promise<RedactedUser> {
        const [userData] = await db
            .select({
                id: user.id,
                name: user.name,
                image: user.image
            })
            .from(user)
            .where(eq(user.id, id))
            .limit(1)
        if (!userData) throw new Error('User not found')
        return userData
    }

    static async getUserAsUser(currentUserId: string, targetUserId: string) : Promise<RedactedUser|User> {
        if (currentUserId === targetUserId) {
            return await this.getUserById(targetUserId)
        }else {
            return await this.getRedactedUserById(targetUserId)
        }
    }

    static async upsertUserAsSystem (data: { id: string; name: string; email: string; emailVerified?: boolean; image?: string|null; groups?: string }) : Promise<User> {
        const [result] = await db
            .insert(user)
            .values(data)
            .onConflictDoUpdate({
                target: user.id,
                set: data
            })
            .returning()

        if (!result) throw new Error('Failed to upsert user')    

        return result
    }
}