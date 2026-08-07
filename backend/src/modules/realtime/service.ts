import { EventEmitter } from 'events';
import { sse } from 'elysia';
import { db } from '../../db';
import { room, directMessage } from '../chat/schema';
import { eq, and, or } from 'drizzle-orm';
import { PermissionService } from '../permission/service';

export const globalBus = new EventEmitter();
globalBus.setMaxListeners(1000); // Increase max listeners to avoid warnings in large deployments

// Map tracking active connections: Map<userId, Map<connectionId, Session>>
interface ConnectionSession {
  push: (event: ReturnType<typeof sse>) => void;
  activeTopics: Set<string>;
}
const userSessions = new Map<string, Map<string, ConnectionSession>>();

// 1. Register a new stream session
export function registerConnection(userId: string, connectionId: string, push: (event: ReturnType<typeof sse>) => void) {
  console.log(`Registering connection for user ${userId}, connection ${connectionId}`);
  if (!userSessions.has(userId)) {
    console.log(`Creating new session map for user ${userId}`);
    userSessions.set(userId, new Map());
  }
  userSessions.get(userId)!.set(connectionId, { push, activeTopics: new Set() });
  console.log(`Active connections for user ${userId}: ${userSessions.get(userId)!.size}`);
}

// 2. Clean up event listeners & memory on disconnect
export function unregisterConnection(userId: string, connectionId: string) {
  console.log(`Unregistering connection for user ${userId}, connection ${connectionId}`);
  const userConns = userSessions.get(userId);
  if (!userConns) return;
  console.log(`Active connections for user ${userId} before cleanup: ${userConns.size}`);

  const session = userConns.get(connectionId);
  if (session) {
    for (const topic of session.activeTopics) {
      globalBus.off(topic, session.push);
    }
    userConns.delete(connectionId);
  }

  if (userConns.size === 0) userSessions.delete(userId);
}

/**
 * Queries the DB to determine which rooms a user has access to,
 * then diffs against currently subscribed topics and updates them.
 */
export async function recalculateSubscriptions(userId: string) {
  console.log(`Recalculating subscriptions for user ${userId}`);
  const userConns = userSessions.get(userId);
  if (!userConns) return; // Offline, nothing to sync

  // Source of Truth: Fetch allowed room IDs from DB
  const allowedRoomIds = await getAllowedRoomIds(userId);

  const targetTopics = new Set([
    ...allowedRoomIds.map(id => `room:${id}`),
    `user:${userId}`, // personal notifications
  ]);

  // Diff and update every active device for this user
  for (const session of userConns.values()) {
    // Remove stale topics
    for (const topic of session.activeTopics) {
      if (!targetTopics.has(topic)) {
        globalBus.off(topic, session.push);
        session.activeTopics.delete(topic);
      }
    }
    // Add new topics
    for (const topic of targetTopics) {
      if (!session.activeTopics.has(topic)) {
        globalBus.on(topic, session.push);
        session.activeTopics.add(topic);
      }
    }
  }
}

/**
 * Determines all room IDs a user is allowed to access.
 * For channels: checks permission via PermissionService.
 * For DMs: checks if user is a participant.
 */
async function getAllowedRoomIds(userId: string): Promise<string[]> {
  const allRooms = await db.query.room.findMany();
  const allowed: string[] = [];

  for (const r of allRooms) {
    if (r.type === 'channel') {
      const canView = await PermissionService.hasPermissionInChannel(userId, r.id, 'view_channel');
      if (canView) {
        allowed.push(r.id);
      }
    } else if (r.type === 'dm') {
      const dm = await db.query.directMessage.findFirst({
        where: and(
          eq(directMessage.roomId, r.id),
          or(eq(directMessage.userAId, userId), eq(directMessage.userBId, userId))
        )
      });
      if (dm) {
        allowed.push(r.id);
      }
    }
  }

  return allowed;
}