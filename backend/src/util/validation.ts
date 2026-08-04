/**
 * Validates a channel name.
 * Rules: 1-100 chars, lowercase alphanumeric + hyphens + underscores, no leading/trailing spaces.
 */
export function validateChannelName(name: string): { valid: boolean; error?: string } {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Channel name is required' };
    }

    const trimmed = name.trim();

    if (trimmed.length < 1) {
        return { valid: false, error: 'Channel name must be at least 1 character' };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: 'Channel name must be at most 100 characters' };
    }

    if (!/^[a-z0-9_-]+$/.test(trimmed)) {
        return { valid: false, error: 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores' };
    }

    return { valid: true };
}