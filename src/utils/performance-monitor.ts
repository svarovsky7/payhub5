/**
 * Performance monitoring utilities for SQL queries
 * Tracks query execution times, detects slow queries, and provides metrics
 */

import { supabase } from '../services/supabase'

interface QueryMetrics {
  queryType: string
  executionTimeMs: number
  queryHash?: string
  parameters?: Record<string, any>
  userId?: string
  companyId?: string
  resultCount?: number
  timestamp: Date
}

interface PerformanceSettings {
  slowQueryThresholdMs: number
  enableLogging: boolean
  enableMetricsCollection: boolean
  maxLogEntries: number
  enableConsoleWarnings: boolean
}

class PerformanceMonitor {
  private settings: PerformanceSettings = {
    slowQueryThresholdMs: 1000, // 1 second
    enableLogging: true,
    enableMetricsCollection: true,
    maxLogEntries: 1000,
    enableConsoleWarnings: true,
  }

  private metricsBuffer: QueryMetrics[] = []
  private totalQueries = 0
  private slowQueries = 0

  /**
   * Configure performance monitoring settings
   */
  configure(settings: Partial<PerformanceSettings>): void {
    this.settings = { ...this.settings, ...settings }
  }

  /**
   * Measure query execution time
   */
  async measureQuery<T>(
    queryType: string,
    queryFunction: () => Promise<T>,
    parameters?: Record<string, any>,
    context?: { userId?: string; companyId?: string }
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await queryFunction()
      const executionTime = performance.now() - startTime
      
      // Extract result count if possible
      let resultCount: number | undefined
      if (result && typeof result === 'object') {
        if ('data' in result && Array.isArray((result as any).data)) {
          resultCount = (result as any).data.length
        } else if ('count' in result) {
          resultCount = (result as any).count
        }
      }

      // Record metrics
      this.recordMetrics({
        queryType,
        executionTimeMs: Math.round(executionTime),
        parameters,
        userId: context?.userId,
        companyId: context?.companyId,
        resultCount,
        timestamp: new Date(),
      })

      return result
    } catch (error) {
      const executionTime = performance.now() - startTime
      
      // Record failed query metrics
      this.recordMetrics({
        queryType: `${queryType}_ERROR`,
        executionTimeMs: Math.round(executionTime),
        parameters,
        userId: context?.userId,
        companyId: context?.companyId,
        timestamp: new Date(),
      })

      throw error
    }
  }

  /**
   * Record query metrics
   */
  private recordMetrics(metrics: QueryMetrics): void {
    if (!this.settings.enableMetricsCollection) {return}

    this.totalQueries++
    
    // Check if query is slow
    if (metrics.executionTimeMs >= this.settings.slowQueryThresholdMs) {
      this.slowQueries++
      
      if (this.settings.enableConsoleWarnings) {
        console.warn(
          `🐌 Slow Query Detected: ${metrics.queryType} took ${metrics.executionTimeMs}ms`,
          {
            parameters: metrics.parameters,
            resultCount: metrics.resultCount,
            userId: metrics.userId,
            companyId: metrics.companyId,
          }
        )
      }

      // Log to database if enabled
      if (this.settings.enableLogging) {
        this.logSlowQuery(metrics).catch(error => {
          console.error('Failed to log slow query:', error)
        })
      }
    }

    // Add to buffer
    this.metricsBuffer.push(metrics)
    
    // Keep buffer size manageable
    if (this.metricsBuffer.length > this.settings.maxLogEntries) {
      this.metricsBuffer = this.metricsBuffer.slice(-this.settings.maxLogEntries / 2)
    }
  }

  /**
   * Log slow query to database
   */
  private async logSlowQuery(metrics: QueryMetrics): Promise<void> {
    try {
      const { error } = await supabase
        .from('query_performance_log')
        .insert([
          {
            query_type: metrics.queryType,
            execution_time_ms: metrics.executionTimeMs,
            query_hash: this.generateQueryHash(metrics),
            parameters: metrics.parameters || {},
            user_id: metrics.userId,
            company_id: metrics.companyId,
          }
        ])

      if (error) {
        console.error('Error logging slow query:', error)
      }
    } catch (error) {
      // Silently fail logging to avoid affecting application performance
      console.debug('Performance logging failed:', error)
    }
  }

  /**
   * Generate hash for query identification
   */
  private generateQueryHash(metrics: QueryMetrics): string {
    const hashString = `${metrics.queryType}_${JSON.stringify(metrics.parameters || {})}`
    return btoa(hashString).substring(0, 32)
  }

  /**
   * Get current performance statistics
   */
  getStats(): {
    totalQueries: number
    slowQueries: number
    slowQueryPercentage: number
    averageExecutionTime: number
    recentQueries: QueryMetrics[]
  } {
    const recentQueries = this.metricsBuffer.slice(-10)
    const averageExecutionTime = this.metricsBuffer.length > 0
      ? this.metricsBuffer.reduce((sum, m) => sum + m.executionTimeMs, 0) / this.metricsBuffer.length
      : 0

    return {
      totalQueries: this.totalQueries,
      slowQueries: this.slowQueries,
      slowQueryPercentage: this.totalQueries > 0 ? (this.slowQueries / this.totalQueries) * 100 : 0,
      averageExecutionTime: Math.round(averageExecutionTime),
      recentQueries,
    }
  }

  /**
   * Get top slowest query types
   */
  getSlowQueryTypes(limit = 10): Array<{
    queryType: string
    count: number
    avgExecutionTime: number
    maxExecutionTime: number
  }> {
    const queryTypeStats = new Map<string, { 
      count: number
      totalTime: number
      maxTime: number 
    }>()

    // Only consider slow queries
    this.metricsBuffer
      .filter(m => m.executionTimeMs >= this.settings.slowQueryThresholdMs)
      .forEach(metrics => {
        const existing = queryTypeStats.get(metrics.queryType) || {
          count: 0,
          totalTime: 0,
          maxTime: 0,
        }

        existing.count++
        existing.totalTime += metrics.executionTimeMs
        existing.maxTime = Math.max(existing.maxTime, metrics.executionTimeMs)
        
        queryTypeStats.set(metrics.queryType, existing)
      })

    return Array.from(queryTypeStats.entries())
      .map(([queryType, stats]) => ({
        queryType,
        count: stats.count,
        avgExecutionTime: Math.round(stats.totalTime / stats.count),
        maxExecutionTime: stats.maxTime,
      }))
      .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)
      .slice(0, limit)
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metricsBuffer = []
    this.totalQueries = 0
    this.slowQueries = 0
  }

  /**
   * Get performance report
   */
  generateReport(): {
    summary: ReturnType<typeof this.getStats>
    slowestQueries: ReturnType<typeof this.getSlowQueryTypes>
    recommendations: string[]
  } {
    const stats = this.getStats()
    const slowestQueries = this.getSlowQueryTypes(5)
    const recommendations: string[] = []

    // Generate recommendations based on metrics
    if (stats.slowQueryPercentage > 10) {
      recommendations.push('⚠️ High percentage of slow queries detected. Consider adding indexes or optimizing query patterns.')
    }

    if (stats.averageExecutionTime > 500) {
      recommendations.push('⚠️ Average query execution time is high. Review query complexity and database performance.')
    }

    if (slowestQueries.some(q => q.queryType.includes('getListWithStats'))) {
      recommendations.push('🔧 N+1 query patterns detected in stats queries. Use materialized views or JOIN-based approaches.')
    }

    if (slowestQueries.some(q => q.queryType.includes('Export'))) {
      recommendations.push('📊 Export queries are slow. Consider implementing pagination or background job processing.')
    }

    if (slowestQueries.some(q => q.avgExecutionTime > 5000)) {
      recommendations.push('🚨 Critical: Some queries take over 5 seconds. Immediate optimization required.')
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Query performance looks good!')
    }

    return {
      summary: stats,
      slowestQueries,
      recommendations,
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Decorator for automatic query performance monitoring
 */
export function monitorQuery(queryType: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      return await performanceMonitor.measureQuery(
        `${target.constructor.name}.${propertyName}`,
        () => method.apply(this, args),
        { args: args.length > 0 ? args[0] : undefined },
        { 
          userId: args.find(arg => arg?.userId)?.userId,
          companyId: args.find(arg => arg?.companyId)?.companyId,
        }
      )
    }

    return descriptor
  }
}

/**
 * Utility function to wrap individual queries with monitoring
 */
export async function withPerformanceMonitoring<T>(
  queryType: string,
  queryFunction: () => Promise<T>,
  context?: {
    parameters?: Record<string, any>
    userId?: string
    companyId?: string
  }
): Promise<T> {
  return await performanceMonitor.measureQuery(
    queryType,
    queryFunction,
    context?.parameters,
    context
  )
}

/**
 * React hook for performance monitoring in components
 */
export function usePerformanceMonitoring() {
  const measureQuery = async <T>(
    queryType: string,
    queryFunction: () => Promise<T>,
    context?: {
      parameters?: Record<string, any>
      userId?: string
      companyId?: string
    }
  ): Promise<T> => {
    return await withPerformanceMonitoring(queryType, queryFunction, context)
  }

  const getStats = () => performanceMonitor.getStats()
  const generateReport = () => performanceMonitor.generateReport()

  return {
    measureQuery,
    getStats,
    generateReport,
  }
}

/**
 * Performance monitoring configuration for development
 */
export const developmentConfig: PerformanceSettings = {
  slowQueryThresholdMs: 500, // More strict in development
  enableLogging: true,
  enableMetricsCollection: true,
  maxLogEntries: 2000,
  enableConsoleWarnings: true,
}

/**
 * Performance monitoring configuration for production
 */
export const productionConfig: PerformanceSettings = {
  slowQueryThresholdMs: 2000, // Less strict in production
  enableLogging: true,
  enableMetricsCollection: true,
  maxLogEntries: 500,
  enableConsoleWarnings: false, // Avoid console spam in production
}

// Auto-configure based on environment
if (import.meta.env.DEV) {
  performanceMonitor.configure(developmentConfig)
} else {
  performanceMonitor.configure(productionConfig)
}

// Log performance report periodically in development
if (import.meta.env.DEV) {
  setInterval(() => {
    const report = performanceMonitor.generateReport()
    if (report.summary.totalQueries > 0) {
      console.group('📊 Query Performance Report')
      console.log('Summary:', report.summary)
      console.log('Slowest Queries:', report.slowestQueries)
      console.log('Recommendations:', report.recommendations)
      console.groupEnd()
    }
  }, 60000) // Every minute in development
}