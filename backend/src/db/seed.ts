import { db } from './index';
import { user } from '../modules/user/schema';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '../lib/logger';
import { ok, err, type Result, type InternalError } from '../lib/result';

const logger = createLogger('seed');

export const seedDatabase = async (): Promise<Result<null, InternalError>> => {
    logger.info('seeding database...');

    try {

        logger.info('database seeded successfully');
        return ok(null);
    } catch (e) {
        logger.error('database seeding failed', { error: String(e) });
        return err({ status: 500, code: 'INTERNAL_ERROR', message: 'Database seeding failed' });
    }
}