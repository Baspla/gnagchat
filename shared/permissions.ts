// shared/permissions.ts

export const PERMISSIONS = [
    'view_channel',
    'send_messages',
    'manage_messages',
    'manage_roles',
    'admin'
] as const;

export type Permission = typeof PERMISSIONS[number];