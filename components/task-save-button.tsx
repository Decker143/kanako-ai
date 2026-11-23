"use client";

import { useFormStatus } from "react-dom";

export function TaskSaveButton() {
  const { pending } = useFormStatus();

  return (
    <button className="btn secondary" type="submit" disabled={pending} aria-live="polite">
      {pending ? "Saving task..." : "Save task"}
    </button>
  );
}
