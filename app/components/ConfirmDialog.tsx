import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";

export type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
};

export type AlertDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
};

type DialogState =
  | { type: "confirm"; options: ConfirmDialogOptions; resolve: (value: boolean) => void }
  | { type: "alert"; options: AlertDialogOptions; resolve: () => void };

const ConfirmDialogContext = createContext<{
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
} | null>(null);

function DialogOverlay({
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  variant = "default",
  mode,
  onCancel,
  onConfirm,
}: ConfirmDialogOptions & {
  mode: "confirm" | "alert";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDanger = variant === "danger";
  const Icon = isDanger ? AlertTriangle : AlertCircle;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1200] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100"
      >
        <div className="p-6 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600"
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                id="confirm-dialog-title"
                className="text-[17px] font-bold text-slate-900 tracking-tight"
              >
                {title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium mt-1 whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
          {mode === "confirm" && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ type: "confirm", options, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertDialogOptions) => {
    return new Promise<void>((resolve) => {
      setDialog({ type: "alert", options, resolve });
    });
  }, []);

  const closeDialog = (result: boolean) => {
    if (!dialog) return;
    if (dialog.type === "confirm") {
      dialog.resolve(result);
    } else if (result) {
      dialog.resolve();
    }
    setDialog(null);
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <DialogOverlay
          title={dialog.options.title}
          message={dialog.options.message}
          confirmLabel={
            dialog.options.confirmLabel ??
            (dialog.type === "alert"
              ? "OK"
              : (dialog.options as ConfirmDialogOptions).variant === "danger"
                ? "Delete"
                : "Confirm")
          }
          cancelLabel={
            dialog.type === "confirm"
              ? (dialog.options as ConfirmDialogOptions).cancelLabel ?? "Cancel"
              : "Cancel"
          }
          variant={
            dialog.type === "confirm"
              ? (dialog.options as ConfirmDialogOptions).variant ?? "default"
              : "default"
          }
          mode={dialog.type}
          onCancel={() => closeDialog(false)}
          onConfirm={() => closeDialog(true)}
        />
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return context;
}
