export const Modules = {
    USERS: 'users',
    FRIENDS: 'friends',
    DMS: 'dms',
    POINTS: 'points',
    MESSAGING: 'messaging',
    COMMENTS: 'comments',
    PREDICTIONS: 'predictions',
    FINANCIAL_MARKETS: 'financial_markets',
    AUDIT: 'audit',
    AUTH: 'auth',
    FEATURES: 'features',
    TELEMETRY: 'telemetry',
} as const;

export type ModuleId = typeof Modules[keyof typeof Modules]; 

export const ThreadTypes = {
    DIRECT: 'direct',
    GROUP: 'group',
    COMMENT: 'comment',
} as const;

export type ThreadType = typeof ThreadTypes[keyof typeof ThreadTypes];

export const NotificationTypes = {
    GROUP_INVITE: 'GROUP_INVITE',
    POST_MENTION: 'POST_MENTION',
    SYSTEM_ALERT: 'SYSTEM_ALERT',
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];