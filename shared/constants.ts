export const Modules = {
    CHAT: 'chat',
    GATEWAY: 'gateway',
    USER: 'user',
    PERMISSION: 'permission',
    AUTH: 'auth',
    LIVEKIT: 'livekit',
} as const;

export type ModuleId = typeof Modules[keyof typeof Modules]; 

export const NotificationTypes = {
    GROUP_INVITE: 'GROUP_INVITE',
    POST_MENTION: 'POST_MENTION',
    SYSTEM_ALERT: 'SYSTEM_ALERT',
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];