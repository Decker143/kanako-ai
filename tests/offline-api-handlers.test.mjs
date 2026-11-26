import test from "node:test";
import assert from "node:assert/strict";
import { handleTaskSync, handleRunSync, handleSnapshot } from "../lib/offline/api-handlers.ts";

const orgId = "2835bc9e-c1df-461a-a7e3-c8cb2c2af9b6";
const taskId = "8c70e0ad-2bb3-4ac5-8b19-33df5abbe891";
const runId = "7c70e0ad-2bb3-4ac5-8b19-33df5abbe891";
const agentId = "9b70e0ad-2bb3-4ac5-8b19-33df5abbe891";
const user = { id: "b2eedd87-efbf-4ad0-a15b-f587cc8c6719" };

function makeClient(options = {}) {
  const state = {
    membership: options.membership === undefined ? { organization_id: orgId, role: "owner" } : options.membership,
    user: options.user === undefined ? user : options.user,
    insertedTasks: new Map(),
    insertCalls: [],
    rpcCalls: [],
    insertError: options.insertError ?? null,
    rpcError: options.rpcError ?? null,
    snapshotErrorTable: options.snapshotErrorTable ?? null,
  };

  function query(table) {
    let offlineClientId = null;
    let result = { data: [], error: null };
    const builder = {
      select() { return builder; },
      eq() { return builder; },
      filter(_column, _operator, value) { offlineClientId = value; return builder; },
      in() { return builder; },
      order() { return builder; },
      limit() { return builder; },
      maybeSingle() {
        if (table === "organization_members") return Promise.resolve({ data: state.membership, error: options.membershipError ?? null });
        if (table === "organizations") return Promise.resolve({ data: options.organization ?? { name: "Dev Test Workspace" }, error: null });
        if (table === "tasks") return Promise.resolve({ data: state.insertedTasks.get(offlineClientId) ?? null, error: null });
        return Promise.resolve({ data: null, error: null });
      },
      insert(payload) {
        state.insertCalls.push(payload);
        if (!state.insertError) state.insertedTasks.set(payload.metadata.offline_client_id, { id: "persisted-task" });
        return Promise.resolve({ error: state.insertError });
      },
      then(resolve, reject) {
        if (table === state.snapshotErrorTable) result = { data: null, error: { message: "synthetic query failure" } };
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return builder;
  }

  return {
    state,
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: query,
    rpc: async (...args) => {
      state.rpcCalls.push(args);
      return { data: { synced: true, duplicate: state.rpcCalls.length > 1 }, error: state.rpcError };
    },
  };
}

const request = (body, path = "/api/offline/sync") =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("task sync rejects unauthenticated requests", async () => {
  const client = makeClient({ user: null });
  const response = await handleTaskSync(request({ organizationId: orgId, tasks: [{ id: taskId, title: "Test" }] }), client);
  assert.equal(response.status, 401);
  assert.equal(client.state.insertCalls.length, 0);
});

test("task sync retries are idempotent at the handler boundary", async () => {
  const client = makeClient();
  const payload = { organizationId: orgId, tasks: [{ id: taskId, title: "Retry-safe task" }] };
  const first = await handleTaskSync(request(payload), client);
  const retry = await handleTaskSync(request(payload), client);
  assert.equal(first.status, 200);
  assert.equal(retry.status, 200);
  assert.equal((await first.json()).count, 1);
  assert.equal((await retry.json()).count, 1);
  assert.equal(client.state.insertCalls.length, 1);
});

test("task sync returns a retryable failure when persistence fails", async () => {
  const client = makeClient({ insertError: { code: "XX000", message: "synthetic failure" } });
  const response = await handleTaskSync(request({ organizationId: orgId, tasks: [{ id: taskId, title: "Will fail" }] }), client);
  assert.equal(response.status, 500);
  assert.deepEqual((await response.json()).syncedIds, []);
});

test("task sync denies a workspace the authenticated user does not belong to", async () => {
  const client = makeClient({ membership: null });
  const response = await handleTaskSync(request({ organizationId: orgId, tasks: [{ id: taskId, title: "Cross workspace" }] }), client);
  assert.equal(response.status, 403);
  assert.equal(client.state.insertCalls.length, 0);
});

test("AI-result sync requires owner or admin membership", async () => {
  const client = makeClient({ membership: { organization_id: orgId, role: "member" } });
  const response = await handleRunSync(request({
    organizationId: orgId,
    runs: [{ id: runId, agentId, taskId, output: "Synthetic result" }],
  }, "/api/offline/sync-runs"), client);
  assert.equal(response.status, 403);
  assert.equal(client.state.rpcCalls.length, 0);
});

test("AI-result sync delegates repeat submissions to the idempotent RPC", async () => {
  const client = makeClient();
  const payload = {
    organizationId: orgId,
    runs: [{ id: runId, agentId, taskId, output: "Synthetic result", model: "local-test" }],
  };
  const first = await handleRunSync(request(payload, "/api/offline/sync-runs"), client);
  const retry = await handleRunSync(request(payload, "/api/offline/sync-runs"), client);
  assert.equal(first.status, 200);
  assert.equal(retry.status, 200);
  assert.equal(client.state.rpcCalls.length, 2);
  assert.equal(client.state.rpcCalls[0][0], "sync_offline_agent_run");
  assert.equal(client.state.rpcCalls[0][1].p_offline_client_id, runId);
});

test("AI-result sync denies non-members before invoking the RPC", async () => {
  const client = makeClient({ membership: null });
  const response = await handleRunSync(request({
    organizationId: orgId,
    runs: [{ id: runId, agentId, taskId, output: "Synthetic result" }],
  }, "/api/offline/sync-runs"), client);
  assert.equal(response.status, 403);
  assert.equal(client.state.rpcCalls.length, 0);
});

test("AI-result sync reports RPC failures without marking the result synced", async () => {
  const client = makeClient({ rpcError: { message: "synthetic RPC failure" } });
  const response = await handleRunSync(request({
    organizationId: orgId,
    runs: [{ id: runId, agentId, taskId, output: "Synthetic result" }],
  }, "/api/offline/sync-runs"), client);
  assert.equal(response.status, 409);
  assert.deepEqual((await response.json()).syncedIds, []);
});

test("snapshot fails closed when a required workspace query fails", async () => {
  const client = makeClient({ snapshotErrorTable: "ai_agents" });
  const response = await handleSnapshot(new Request(`http://localhost/api/offline/snapshot?organizationId=${orgId}`), client);
  assert.equal(response.status, 500);
});
