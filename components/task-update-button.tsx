"use client";

import { useFormStatus } from "react-dom";

export function TaskUpdateButton() {
  const { pending } = useFormStatus();

  return (
    <button className="btn secondary" type="submit" disabled={pending} aria-live="polite">
      {pending ? "Saving update..." : "Save update"}
    </button>
  );
}
