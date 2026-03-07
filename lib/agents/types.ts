export interface AgentRunResult<T> {
  data: T;
  warnings: string[];
  errors: string[];
}
