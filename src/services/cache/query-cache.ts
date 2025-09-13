/**
 * Query result caching implementation for PayHub5
 * Provides intelligent caching with automatic invalidation
 */

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
    key: string
    dependencies: string[] // For automatic invalidation
}

interface CacheConfig {
    defaultTTL: number
    maxSize: number
    enableLogging: boolean
}

export class QueryCache {
    private static instance: QueryCache
    private cache = new Map<string, CacheEntry<any>>()
    private config: CacheConfig

    private constructor(config?: Partial<CacheConfig>) {
        this.config = {
            defaultTTL: 5 * 60 * 1000, // 5 minutes default
            maxSize: 1000,
            enableLogging: false,
            ...config
        }

        // Clean expired entries every minute
        setInterval(() => this.cleanExpired(), 60000)
    }

    static getInstance(config?: Partial<CacheConfig>): QueryCache {
        if (!QueryCache.instance) {
            QueryCache.instance = new QueryCache(config)
        }
        return QueryCache.instance
    }

    /**
     * Get cached data or execute query function
     */
    async get<T>(_key: string, queryFn: () => Promise<T>,
                 options?: {
                     ttl?: number
                     dependencies?: string[]
                     skipCache?: boolean
                 }
    ): Promise<T> {
        const finalKey = this.normalizeKey(key)

        // Skip cache if requested
        if (options?.skipCache) {
            const data = await queryFn()
            this.set(finalKey, data, options)
            return data
        }

        // Check if cached and not expired
        const cached = this.cache.get(finalKey)
        if (cached && this.isValid(cached)) {
            if (this.config.enableLogging) {
                console.log('[QueryCache] Cache hit:', finalKey)
            }
            return cached.data
        }

        // Execute query and cache result
        if (this.config.enableLogging) {
            console.log('[QueryCache] Cache miss, executing query:', finalKey)
        }

        const data = await queryFn()
        this.set(finalKey, data, options)

        return data
    }

    /**
     * Set data in cache
     */
    set<T>(
        key: string,
        data: T,
        options?: {
            ttl?: number
            dependencies?: string[]
        }
    ): void {
        const finalKey = this.normalizeKey(key)
        const ttl = options?.ttl ?? this.config.defaultTTL

        // Ensure cache doesn't exceed max size
        if (this.cache.size >= this.config.maxSize) {
            this.evictOldest()
        }

        this.cache.set(finalKey, {
            data,
            timestamp: Date.now(),
            ttl,
            key: finalKey,
            dependencies: options?.dependencies ?? []
        })

        if (this.config.enableLogging) {
            console.log('[QueryCache] Cached:', finalKey, 'TTL:', ttl + 'ms')
        }
    }

    /**
     * Invalidate cache entries by key pattern or dependencies
     */
    invalidate(pattern: string | string[]): void {
        const patterns = Array.isArray(pattern) ? pattern : [pattern]
        let invalidatedCount = 0

        for (const [key, entry] of this.cache.entries()) {
            // Check if key matches pattern
            const keyMatches = patterns.some(p =>
                key.includes(p) || this.matchesWildcard(key, p)
            )

            // Check if entry has matching dependencies
            const dependencyMatches = entry.dependencies.some(dep =>
                patterns.some(p => dep.includes(p) || this.matchesWildcard(dep, p))
            )

            if (keyMatches ?? dependencyMatches) {
                this.cache.delete(key)
                invalidatedCount++
            }
        }

        if (this.config.enableLogging && invalidatedCount > 0) {
            console.log('[QueryCache] Invalidated', invalidatedCount, 'entries for patterns:', patterns)
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear()
        if (this.config.enableLogging) {
            console.log('[QueryCache] Cache cleared')
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        size: number
        maxSize: number
        hitRate: number
        oldestEntry: number | null
        newestEntry: number | null
    } {
        const entries = Array.from(this.cache.values())
        const timestamps = entries.map(e => e.timestamp)

        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            hitRate: 0, // Would need hit/miss tracking
            oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
            newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null
        }
    }

    private normalizeKey(key: string): string {
        return key.toLowerCase().trim()
    }

    private isValid(entry: CacheEntry<any>): boolean {
        return Date.now() - entry.timestamp < entry.ttl
    }

    private cleanExpired(): void {
        const now = Date.now()
        let cleanedCount = 0

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp >= entry.ttl) {
                this.cache.delete(key)
                cleanedCount++
            }
        }

        if (this.config.enableLogging && cleanedCount > 0) {
            console.log('[QueryCache] Cleaned', cleanedCount, 'expired entries')
        }
    }

    private evictOldest(): void {
        let oldestKey: string | null = null
        let oldestTimestamp = Date.now()

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp
                oldestKey = key
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey)
            if (this.config.enableLogging) {
                console.log('[QueryCache] Evicted oldest entry:', oldestKey)
            }
        }
    }

    private matchesWildcard(text: string, pattern: string): boolean {
        const regex = new RegExp(
            pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
            'i'
        )
        return regex.test(text)
    }
}

// Cache key generators for different domains
export const CacheKeys = {
    // Invoice cache keys
    invoices: {
        list: (filters: any, pagination: any) =>
            `invoices:list:${JSON.stringify({filters, pagination})}`,
        byId: (id: string) => `invoices:byId:${id}`,
        stats: (companyId: string, filters?: any) =>
            `invoices:stats:${companyId}:${JSON.stringify(filters ?? {})}`,
        dashboard: (companyId: string) => `invoices:dashboard:${companyId}`,
        search: (query: string, companyId: string) =>
            `invoices:search:${companyId}:${query}`,
    },

    // Payment cache keys
    payments: {
        list: (filters: any, pagination: any) =>
            `payments:list:${JSON.stringify({filters, pagination})}`,
        byId: (id: string) => `payments:byId:${id}`,
        byInvoiceId: (invoiceId: string) => `payments:byInvoiceId:${invoiceId}`,
        stats: (companyId: string, filters?: any) =>
            `payments:stats:${companyId}:${JSON.stringify(filters ?? {})}`,
        dashboard: (companyId: string) => `payments:dashboard:${companyId}`,
        pending: (companyId: string) => `payments:pending:${companyId}`,
    },

    // Contractor cache keys
    contractors: {
        list: (filters: any, pagination: any) =>
            `contractors:list:${JSON.stringify({filters, pagination})}`,
        byId: (id: string) => `contractors:byId:${id}`,
        byTaxId: (taxId: string, companyId: string) =>
            `contractors:byTaxId:${companyId}:${taxId}`,
        active: (companyId: string) => `contractors:active:${companyId}`,
        stats: (companyId: string) => `contractors:stats:${companyId}`,
        search: (query: string, companyId: string) =>
            `contractors:search:${companyId}:${query}`,
    },

    // Approval cache keys
    approvals: {
        myApprovals: (userId: string, pagination: any) =>
            `approvals:myApprovals:${userId}:${JSON.stringify(pagination)}`,
        stats: (userId: string, userRole: string) =>
            `approvals:stats:${userId}:${userRole}`,
        workflowHistory: (workflowId: number) =>
            `approvals:workflowHistory:${workflowId}`,
    },

    // User/Auth cache keys
    users: {
        byId: (id: string) => `users:byId:${id}`,
        role: (id: string) => `users:role:${id}`,
    },

    // System cache keys
    system: {
        projects: (companyId: string) => `system:projects:${companyId}`,
        invoiceTypes: () => `system:invoiceTypes`,
        workflows: (companyId: string) => `system:workflows:${companyId}`,
    }
}

// Cache TTL configurations for different data types
export const CacheTTL = {
    // Fast-changing data (1-5 minutes)
    REALTIME: 1 * 60 * 1000,      // 1 minute
    DYNAMIC: 5 * 60 * 1000,       // 5 minutes

    // Moderate-changing data (10-30 minutes)
    MODERATE: 10 * 60 * 1000,     // 10 minutes
    SEMI_STATIC: 30 * 60 * 1000,  // 30 minutes

    // Slow-changing data (1-24 hours)
    STATIC: 60 * 60 * 1000,       // 1 hour
    VERY_STATIC: 24 * 60 * 60 * 1000, // 24 hours
}

// Cache dependencies for automatic invalidation
export const CacheDependencies = {
    INVOICES: ['invoices', 'invoice'],
    PAYMENTS: ['payments', 'payment'],
    CONTRACTORS: ['contractors', 'contractor'],
    USERS: ['users', 'user'],
    APPROVALS: ['approvals', 'approval', 'workflows', 'workflow'],
    PROJECTS: ['projects', 'project'],
    SYSTEM: ['system']
}

// Initialize cache instance with default configuration
export const queryCache = QueryCache.getInstance({
    defaultTTL: CacheTTL.DYNAMIC,
    maxSize: 1000,
    enableLogging: process.env.NODE_ENV === 'development'
})

// Cache invalidation helpers
export const invalidateCache = {
    invoices: () => queryCache.invalidate(CacheDependencies.INVOICES),
    payments: () => queryCache.invalidate(CacheDependencies.PAYMENTS),
    contractors: () => queryCache.invalidate(CacheDependencies.CONTRACTORS),
    approvals: () => queryCache.invalidate(CacheDependencies.APPROVALS),
    users: () => queryCache.invalidate(CacheDependencies.USERS),
    all: () => queryCache.clear(),

    // Specific invalidation patterns
    userApprovals: (userId: string) => queryCache.invalidate(`approvals:*:${userId}*`),
    companyData: (companyId: string) => queryCache.invalidate(`*:${companyId}*`),
    invoiceRelated: (invoiceId: string) => {
        queryCache.invalidate([
            `invoices:byId:${invoiceId}`,
            `payments:byInvoiceId:${invoiceId}`,
            'invoices:list*',
            'invoices:stats*',
            'invoices:dashboard*'
        ])
    }
}

export default queryCache;