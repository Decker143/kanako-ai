export type ExactCountResult = { count: number | null; error: unknown | null };

export function exactCountOrUnavailable(result: ExactCountResult): number | null {
  return result.error ? null : result.count;
}

export function hasUnavailableWorkloadMetrics(
  employeeResults: Array<{ assignedCount: number | null; highPriorityCount: number | null }>,
  departmentResults: Array<{ departmentId: string; open: number | null; blocked: number | null; overdue: number | null; unassigned: number | null; completed: number | null }>,
): boolean {
  return employeeResults.some(result => result.assignedCount === null || result.highPriorityCount === null)
    || departmentResults.some(result => Object.values(result).some(value => value === null));
}
