import test from "node:test";
import assert from "node:assert/strict";
import { rankAssignmentCandidates } from "../lib/ai-workforce/assignment-ranking.ts";

const task = {
  title: "Prepare customer service workflow",
  description: "Review customer support and service escalation steps.",
  department_id: "customer-service",
};

const candidate = (id, overrides = {}) => ({
  id,
  department_id: null,
  skills: [],
  remainingCapacity: 1,
  recentSuccessRate: null,
  ...overrides,
});

test("department alignment outranks skill matches from another department", () => {
  const ranked = rankAssignmentCandidates([
    candidate("sales-specialist", {
      department_id: "sales",
      skills: ["customer", "support", "service", "workflow"],
    }),
    candidate("customer-service-specialist", {
      department_id: "customer-service",
      skills: ["customer support"],
    }),
  ], task);

  assert.equal(ranked[0].id, "customer-service-specialist");
  assert.equal(ranked[0].departmentMatch, true);
});

test("a skill tag matches only when all meaningful tag terms appear", () => {
  const ranked = rankAssignmentCandidates([
    candidate("partial", { skills: ["customer success"] }),
    candidate("complete", { skills: ["customer support"] }),
  ], task);

  assert.equal(ranked.find((item) => item.id === "complete").skillMatches, 1);
  assert.equal(ranked.find((item) => item.id === "partial").skillMatches, 0);
});

test("capacity and recent success break ties after department and skill fit", () => {
  const ranked = rankAssignmentCandidates([
    candidate("lower-capacity", {
      department_id: "customer-service",
      skills: ["customer support"],
      remainingCapacity: 1,
      recentSuccessRate: 100,
    }),
    candidate("higher-capacity", {
      department_id: "customer-service",
      skills: ["customer support"],
      remainingCapacity: 3,
      recentSuccessRate: 50,
    }),
  ], task);

  assert.equal(ranked[0].id, "higher-capacity");
});

test("without a department, matching skills determine fit", () => {
  const ranked = rankAssignmentCandidates([
    candidate("generalist", { skills: ["workflow"] }),
    candidate("support-specialist", { skills: ["customer support", "service"] }),
  ], { ...task, department_id: null });

  assert.equal(ranked[0].id, "support-specialist");
  assert.equal(ranked[0].departmentMatch, false);
});

test("empty candidate lists remain empty", () => {
  assert.deepEqual(rankAssignmentCandidates([], task), []);
});
