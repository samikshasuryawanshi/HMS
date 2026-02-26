// In-memory TTL cache for Firestore reads
// Prevents redundant network requests within the same session

const cache = new Map();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a cached value by key
 * @param {string} key - Cache key (e.g., "users/abc123")
 * @returns {any|null} Cached data or null if expired/missing
 */
export const getCached = (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
};

/**
 * Set a cached value
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time-to-live in ms (default: 5 min)
 */
export const setCached = (key, data, ttl = DEFAULT_TTL) => {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttl,
    });
};

/**
 * Invalidate a specific cache entry
 * @param {string} key - Cache key to invalidate
 */
export const invalidateCache = (key) => {
    cache.delete(key);
};

/**
 * Invalidate all cache entries matching a prefix
 * @param {string} prefix - Key prefix to match (e.g., "orders")
 */
export const invalidateCacheByPrefix = (prefix) => {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
        }
    }
};

/**
 * Clear the entire cache
 */
export const clearCache = () => {
    cache.clear();
};
