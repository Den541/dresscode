function ensureRequiredString(
    key: string,
    value: unknown,
): asserts value is string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`Environment variable ${key} is required`);
    }
}

export function validateEnv(config: Record<string, unknown>) {
    ensureRequiredString('DATABASE_URL', config.DATABASE_URL);
    ensureRequiredString('JWT_SECRET', config.JWT_SECRET);

    return config;
}
