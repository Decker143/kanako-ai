export type AssignmentCandidate = {
  id: string;
  department_id: string | null;
  skills?: string[] | null;
  remainingCapacity: number;
  recentSuccessRate: number | null;
};

export type AssignmentTask = {
  title?: string | null;
  description?: string | null;
  department_id?: string | null;
};

export type RankedAssignmentCandidate<T extends AssignmentCandidate> = T & {
  departmentMatch: boolean;
  skillMatches: number;
  fitScore: number;
};

/**
 * Deterministic fit ranking. Department alignment is the strongest signal,
 * followed by complete skill-tag matches. Capacity and recent outcomes only
 * break ties between candidates with the same role-fit score.
 */
export function rankAssignmentCandidates<T extends AssignmentCandidate>(
  candidates: T[],
  task: AssignmentTask,
): RankedAssignmentCandidate<T>[] {
  const taskTerms = new Set(
    ((task.title ?? "") + " " + (task.description ?? ""))
      .toLowerCase()
      .match(/[a-z0-9+#.-]{2,}/g) ?? [],
  );

  return candidates
    .map((candidate) => {
      const departmentMatch = Boolean(
        task.department_id && candidate.department_id === task.department_id,
      );
      const skillMatches = (candidate.skills ?? []).filter((skill) => {
        const skillTerms = (skill.toLowerCase().match(/[a-z0-9+#.-]{2,}/g) ?? [])
          .filter((term) => term.length > 1);
        return skillTerms.length > 0 && skillTerms.every((term) => taskTerms.has(term));
      }).length;

      return {
        ...candidate,
        departmentMatch,
        skillMatches,
        fitScore: (departmentMatch ? 100 : 0) + skillMatches * 10,
      };
    })
    .sort((a, b) =>
      b.fitScore - a.fitScore ||
      b.remainingCapacity - a.remainingCapacity ||
      (b.recentSuccessRate ?? -1) - (a.recentSuccessRate ?? -1) ||
      a.id.localeCompare(b.id),
    );
}
