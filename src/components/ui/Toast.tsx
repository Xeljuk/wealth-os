"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, X, AlertCircle, Info, Undo2 } from "lucide-react";

type ToastKind = "success" | "error" | "info" | "undo";

interface BaseToast {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
  durationMs: number;
}

interface UndoToast {
  id: string;
  kind: "undo";
  message: string;
  timeoutMs: number;
  onUndo: () => void;
  onTimeout: () => void | Promise<void>;
}

type Toast = BaseToast | UndoToast;

interface ToastContextValue {
  success: (message: string, opts?: { durationMs?: number }) => string;
  error: (message: string, opts?: { durationMs?: number }) => string;
  info: (message: string, opts?: { durationMs?: number }) => string;
  undo: (opts: {
    message: string;
    timeoutMs?: number;
    onUndo: () => void;
    onTimeout: () => void | Promise<void>;
  }) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `t${Date.now().toString(36)}_${idCounter}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      if (t.kind === "undo") {
        const timer = setTimeout(() => {
          Promise.resolve(t.onTimeout()).finally(() => dismiss(t.id));
        }, t.timeoutMs);
        timersRef.current.set(t.id, timer);
      } else {
        const timer = setTimeout(() => dismiss(t.id), t.durationMs);
        timersRef.current.set(t.id, timer);
      }
      return t.id;
    },
    [dismiss],
  );

  const success = useCallback<ToastContextValue["success"]>(
    (message, opts) =>
      push({
        id: makeId(),
        kind: "success",
        message,
        durationMs: opts?.durationMs ?? 3500,
      }),
    [push],
  );

  const error = useCallback<ToastContextValue["error"]>(
    (message, opts) =>
      push({
        id: makeId(),
        kind: "error",
        message,
        durationMs: opts?.durationMs ?? 5000,
      }),
    [push],
  );

  const info = useCallback<ToastContextValue["info"]>(
    (message, opts) =>
      push({
        id: makeId(),
        kind: "info",
        message,
        durationMs: opts?.durationMs ?? 3500,
      }),
    [push],
  );

  const undo = useCallback<ToastContextValue["undo"]>(
    (opts) =>
      push({
        id: makeId(),
        kind: "undo",
        message: opts.message,
        timeoutMs: opts.timeoutMs ?? 5000,
        onUndo: opts.onUndo,
        onTimeout: opts.onTimeout,
      }),
    [push],
  );

  const handleUndoClick = useCallback(
    (t: UndoToast) => {
      const timer = timersRef.current.get(t.id);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(t.id);
      }
      t.onUndo();
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    },
    [],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ success, error, info, undo, dismiss }}>
      {children}
      <ToastViewport
        toasts={toasts}
        onDismiss={dismiss}
        onUndoClick={handleUndoClick}
      />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
  onUndoClick,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onUndoClick: (t: UndoToast) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3"
    >
      {toasts.map((t) => (
        <ToastCard
          key={t.id}
          toast={t}
          onDismiss={() => onDismiss(t.id)}
          onUndoClick={() => {
            if (t.kind === "undo") onUndoClick(t);
          }}
        />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
  onUndoClick,
}: {
  toast: Toast;
  onDismiss: () => void;
  onUndoClick: () => void;
}) {
  const accent =
    toast.kind === "success"
      ? "var(--color-positive)"
      : toast.kind === "error"
        ? "var(--color-negative)"
        : toast.kind === "undo"
          ? "var(--color-accent)"
          : "var(--color-text-muted)";

  const Icon =
    toast.kind === "success"
      ? Check
      : toast.kind === "error"
        ? AlertCircle
        : toast.kind === "undo"
          ? Undo2
          : Info;

  const duration =
    toast.kind === "undo" ? toast.timeoutMs : toast.durationMs;

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className="toast-card pointer-events-auto relative overflow-hidden rounded-xl"
      style={{
        backgroundColor: "var(--color-surface)",
        boxShadow:
          "0 18px 48px -20px rgba(45,52,53,0.18), 0 1px 0 0 rgba(45,52,53,0.04)",
        border: "1px solid var(--color-border-light)",
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: "var(--color-vellum-deep)",
            color: accent,
          }}
        >
          <Icon size={13} strokeWidth={2.5} />
        </span>

        <div className="min-w-0 flex-1">
          <p
            className="text-[13px] font-semibold leading-snug tracking-tight"
            style={{
              color: "var(--color-text-primary)",
              letterSpacing: "-0.005em",
            }}
          >
            {toast.message}
          </p>
        </div>

        {toast.kind === "undo" ? (
          <button
            type="button"
            onClick={onUndoClick}
            className="shrink-0 rounded-md px-2.5 py-1 text-[12px] font-semibold tracking-tight transition-opacity hover:opacity-80"
            style={{
              color: "var(--color-accent)",
              backgroundColor: "var(--color-accent-light)",
            }}
          >
            Undo
          </button>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 transition-opacity hover:opacity-70"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Progress bar — shrinks over the lifetime of the toast */}
      <div
        className="toast-progress absolute bottom-0 left-0 h-[2px]"
        style={{
          backgroundColor: accent,
          animationDuration: `${duration}ms`,
        }}
      />
    </div>
  );
}
