// modules/permissions/service.ts
import { eq, inArray, and } from 'drizzle-orm';
import { db } from '../../db';
import { userRole, role, channelRoleOverride } from './schema';
import type { Permission } from '$shared/permissions';

export class PermissionService {
    
    /**
     * Calculates the final permissions for a user in a specific channel, returning a Set of strings.
     */
    static async getChannelPermissions(userId: string, channelId: string): Promise<Set<Permission>> {
        // 1. Fetch all roles this user has
        const userRoleRecords = await db
            .select({ id: role.id, permissions: role.permissions })
            .from(userRole)
            .innerJoin(role, eq(userRole.roleId, role.id))
            .where(eq(userRole.userId, userId));

        if (userRoleRecords.length === 0) return new Set();

        const roleIds = userRoleRecords.map(r => r.id);
        
        // 2. Combine all base permissions into a single Set
        const currentPerms = new Set<Permission>();
        for (const role of userRoleRecords) {
            for (const perm of role.permissions) {
                currentPerms.add(perm);
            }
        }

        // 3. Admin Bypass
        if (currentPerms.has('admin')) {
            // Return a set containing all possible permissions
            return new Set([
                'view_channel', 
                'send_messages', 
                'manage_messages', 
                'manage_roles', 
                'admin'
            ]); 
        }

        // 4. Fetch Channel Overrides
        const overrides = await db.query.channelRoleOverride.findMany({
            where: and(
                eq(channelRoleOverride.channelId, channelId),
                inArray(channelRoleOverride.roleId, roleIds)
            )
        });

        // 5. Apply Denies (Remove from Set)
        for (const override of overrides) {
            for (const perm of override.denied) {
                currentPerms.delete(perm);
            }
        }

        // 6. Apply Allows (Add to Set)
        for (const override of overrides) {
            for (const perm of override.allowed) {
                currentPerms.add(perm);
            }
        }

        return currentPerms;
    }

    /**
     * Helper check
     */
    static async hasPermissionInChannel(userId: string, channelId: string, required: Permission): Promise<boolean> {
        const finalPerms = await this.getChannelPermissions(userId, channelId);
        return finalPerms.has(required);
    }
}