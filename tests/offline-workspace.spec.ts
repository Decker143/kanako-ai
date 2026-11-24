import { expect, test } from "@playwright/test";

const snapshot = {
  organizationId: "workspace-a",
  organizationName: "Browser Test Workspace",
  preparedAt: "2026-11-25T00:00:00.000Z",
  agents: [],
  tasks: [],
  departments: [],
  memories: [],
  learningEvents: [],
  previousRuns: [],
  knowledgeDocuments: [],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/offline/snapshot**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(snapshot) }),
  );
});

test("saves local task drafts and restores them after reload", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kanako-ai-active-org", "workspace-a"));
  await page.goto("/offline");

  await expect(page.getByRole("heading", { name: "Your private local AI workspace." })).toBeVisible();
  await page.getByPlaceholder("Task title").fill("Browser persistence check");
  await page.getByPlaceholder("Task details").fill("Saved locally for the Phase 1 browser test.");
  await page.getByRole("button", { name: "Save on this device" }).click();

  const task = page.locator(".offline-task").filter({ hasText: "Browser persistence check" });
  await expect(task).toContainText("Local only");
  await page.reload();
  await expect(page.locator(".offline-task").filter({ hasText: "Browser persistence check" })).toContainText("Local only");
});

test("keeps local task drafts isolated when the active workspace changes", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kanako-ai-active-org", "workspace-a"));
  await page.goto("/offline");
  await page.getByPlaceholder("Task title").fill("Workspace A private draft");
  await page.getByRole("button", { name: "Save on this device" }).click();
  await expect(page.locator(".offline-task").filter({ hasText: "Workspace A private draft" })).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem("kanako-ai-active-org", "workspace-b");
    window.dispatchEvent(new StorageEvent("storage", {
      key: "kanako-ai-active-org",
      newValue: "workspace-b",
    }));
  });
  await expect(page.getByText("No offline tasks saved yet.")).toBeVisible();
  await expect(page.locator(".offline-task").filter({ hasText: "Workspace A private draft" })).toHaveCount(0);

  await page.evaluate(() => {
    localStorage.setItem("kanako-ai-active-org", "workspace-a");
    window.dispatchEvent(new StorageEvent("storage", {
      key: "kanako-ai-active-org",
      newValue: "workspace-a",
    }));
  });
  await expect(page.locator(".offline-task").filter({ hasText: "Workspace A private draft" })).toBeVisible();
});

test("sends task drafts only after the user presses Sync tasks", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kanako-ai-active-org", "workspace-a"));
  let receivedOrganizationId = "";
  let receivedTaskTitle = "";
  await page.route("**/api/offline/sync", async route => {
    const body = route.request().postDataJSON() as {
      organizationId: string;
      tasks: Array<{ id: string; title: string }>;
    };
    receivedOrganizationId = body.organizationId;
    receivedTaskTitle = body.tasks[0]?.title ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ syncedIds: body.tasks.map(task => task.id), count: body.tasks.length }),
    });
  });

  await page.goto("/offline");
  await page.getByPlaceholder("Task title").fill("Explicit manual sync draft");
  await page.getByRole("button", { name: "Save on this device" }).click();
  await expect(page.locator(".offline-task").filter({ hasText: "Explicit manual sync draft" })).toContainText("Local only");

  await page.getByRole("button", { name: "Sync tasks" }).click();
  await expect(page.locator(".offline-task").filter({ hasText: "Explicit manual sync draft" })).toContainText("Synced");
  expect(receivedOrganizationId).toBe("workspace-a");
  expect(receivedTaskTitle).toBe("Explicit manual sync draft");
});
