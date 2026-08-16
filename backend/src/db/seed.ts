import { db } from './index';
import { role, userRole } from '../modules/permission/schema';
import { user } from '../modules/user/schema';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '../lib/logger';

const logger = createLogger('seed');

export const seedDatabase = async () => {
    logger.info('seeding database...');

    // 1. Create a default role for viewing and sending messages
    const existingRole = await db.query.role.findFirst({
        where: eq(role.name, 'default')
    });

    let roleId: string;
    if (existingRole) {
        roleId = existingRole.id;
        logger.info('default role already exists, skipping');
    } else {
        const [newRole] = await db.insert(role).values({
            name: 'default',
            permissions: ['view_channel', 'send_messages'],
        }).returning();
        roleId = newRole.id;
        logger.info('default role created');
    }

    // 2. Assign the default role to all existing users
    const allUsers = await db.select({ id: user.id }).from(user);
    for (const u of allUsers) {
        const existingAssignment = await db.query.userRole.findFirst({
            where: and(
                eq(userRole.userId, u.id),
                eq(userRole.roleId, roleId)
            )
        });
        if (!existingAssignment) {
            await db.insert(userRole).values({
                userId: u.id,
                roleId: roleId,
            });
        }
    }

    logger.info('database seeded successfully');
}
