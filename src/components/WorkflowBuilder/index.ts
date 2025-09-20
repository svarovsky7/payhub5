// Экспорт компонентов
export { WorkflowBuilder } from './WorkflowBuilder'
export { WorkflowEditor } from './WorkflowEditor'
export { WorkflowList } from './WorkflowList'
export { StageEditor } from './StageEditor'

// Экспорт типов
export type {
  WorkflowDefinition,
  WorkflowRules,
  WorkflowStage,
  StageConditions,
  WorkflowRole,
  ApprovalAction,
  WorkflowWithStages,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  CreateStageInput,
  UpdateStageInput,
} from './types'

// Экспорт констант
export {
  SYSTEM_ROLES,
} from './types'