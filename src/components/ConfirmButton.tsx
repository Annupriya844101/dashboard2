"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function ConfirmButton({
  children,
  confirmText,
  className,
  pendingText,
}: {
  children: ReactNode;
  confirmText?: string;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) {
          e.preventDefault();
        }
      }}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function SubmitButton({
  children,
  className,
  pendingText = "Saving…",
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
