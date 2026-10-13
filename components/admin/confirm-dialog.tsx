"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { btnDangerSolid, btnSecondary } from "./ui";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** May be async; the dialog stays open (busy) until it settles. */
  onConfirm: () => unknown;
};

/**
 * Accessible destructive-action dialog — replaces `window.confirm()` everywhere
 * in the admin. Not a dependency: a plain fixed overlay with focus and keyboard
 * handling.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      // Escape cancels — but never while the action is running.
      if (event.key === "Escape" && !busy) {
        event.stopPropagation();
        onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/50 p-4"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="p-6">
          <h2 id="confirm-dialog-title" className="text-base font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {description ? <p id="confirm-dialog-desc" className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button ref={cancelRef} type="button" disabled={busy} onClick={onCancel} className={btnSecondary}>
            {cancelLabel}
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className={btnDangerSolid}>
            {busy ? "Memproses…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Stateful helper for a single destructive action: `confirm(options)` opens the
 * dialog, and the returned `dialog` node is rendered once by the caller.
 */
export function useConfirmDialog(): { confirm: (options: ConfirmOptions) => void; dialog: ReactNode } {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = useCallback((next: ConfirmOptions) => setOptions(next), []);
  const close = useCallback(() => setOptions(null), []);

  const handleConfirm = useCallback(async () => {
    if (!options) return;
    setBusy(true);
    try {
      await options.onConfirm();
    } finally {
      setBusy(false);
      setOptions(null);
    }
  }, [options]);

  return {
    confirm,
    dialog: (
      <ConfirmDialog
        open={options !== null}
        title={options?.title ?? ""}
        description={options?.description}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={close}
      />
    ),
  };
}
