import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  full?: boolean;
}

export function Button({
  variant = "primary",
  full = false,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-xl px-4 py-3 disabled:opacity-50 disabled:pointer-events-none transition-colors active:scale-[0.98]";
  const variants: Record<string, string> = {
    primary: "bg-primary text-white",
    secondary: "bg-secondary text-white",
    ghost: "bg-transparent text-primary",
    outline: "bg-surface border border-neutral-light text-neutral-dark",
    danger: "bg-danger text-white",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <label className="block w-full">
      {label && (
        <span className="block text-sm font-medium text-neutral-gray mb-1">{label}</span>
      )}
      <input
        className={`w-full rounded-xl border border-neutral-light bg-surface px-4 py-3 text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${className}`}
        {...props}
      />
      {error && <span className="block text-xs text-danger mt-1">{error}</span>}
    </label>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, ...props }: TextAreaProps) {
  return (
    <label className="block w-full">
      {label && (
        <span className="block text-sm font-medium text-neutral-gray mb-1">{label}</span>
      )}
      <textarea
        className="w-full rounded-xl border border-neutral-light bg-surface px-4 py-3 text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        {...props}
      />
    </label>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block w-5 h-5 border-2 border-neutral-light border-t-primary rounded-full animate-spin ${className}`}
    />
  );
}

export function Chip({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-16 h-16 rounded-full bg-neutral-light flex items-center justify-center text-neutral-gray text-3xl mb-3">
        {icon}
      </div>
      <p className="font-semibold text-neutral-dark">{title}</p>
      {subtitle && <p className="text-sm text-neutral-gray mt-1">{subtitle}</p>}
    </div>
  );
}

export function Toast({
  message,
  type = "info",
  onDismiss,
}: {
  message: string;
  type?: "success" | "error" | "info";
  onDismiss?: () => void;
}) {
  const styles: Record<string, string> = {
    success: "bg-success text-white",
    error: "bg-danger text-white",
    info: "bg-neutral-dark text-white",
  };
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-[70] animate-slide-up">
      <div
        className={`rounded-xl px-4 py-3 shadow-xl text-sm font-medium flex items-start justify-between gap-3 ${styles[type]}`}
      >
        <span>{message}</span>
        {onDismiss && (
          <button onClick={onDismiss} className="shrink-0 opacity-80" aria-label="Cerrar">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function formatMoney(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "$0";
  return `$${num.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}