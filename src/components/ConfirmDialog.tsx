import { useEffect, useRef } from 'preact/hooks';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      class="bg-surface-card text-text-primary rounded-xl p-0 max-w-sm w-full backdrop:bg-black/50"
    >
      <div class="p-5">
        <h3 class="text-lg font-semibold mb-2">{title}</h3>
        <p class="text-sm text-text-secondary">{message}</p>
      </div>
      <div class="flex justify-end gap-2 px-5 pb-5">
        <button
          onClick={onCancel}
          class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          class="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
