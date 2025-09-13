/**
 * Projects services barrel export
 */

// Export CRUD service and types
export { ProjectCrudService } from './crud'
export type { ProjectWithRelations } from './crud'

// Export Query service and types
export { ProjectQueryService } from './queries'
export type { ProjectFilters, ProjectStats } from './queries'