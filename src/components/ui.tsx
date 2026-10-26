import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { forwardRef, useRef, useState } from "react";
import { CloseIcon, RestaurantIcon } from "./icons";

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
  const variants: Record<string, string> = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    outline: "btn-outline",
    danger: "btn-danger",
  };
  return (
    <button
      className={`btn ${variants[variant]} px-4 py-3 ${full ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "ref"> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { label, error, icon, className = "", ...rest } = props;
  return (
    <label className="block w-full">
      {label && (
        <span className="block text-sm font-semibold text-neutral-dark mb-1.5">{label}</span>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border border-outline bg-surface-container/50 px-4 py-3 text-neutral-dark placeholder:text-neutral-gray/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent focus:bg-surface ${icon ? "pl-11" : ""} ${className}`}
          {...rest}
        />
      </div>
      {error && <span className="block text-xs text-danger mt-1">{error}</span>}
    </label>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  compact?: boolean;
}

export function TextArea({ label, compact = false, className = "", ...props }: TextAreaProps) {
  return (
    <label className="block w-full">
      {label && (
        <span className="block text-sm font-semibold text-neutral-dark mb-1.5">{label}</span>
      )}
      <textarea
        className={`w-full rounded-xl border border-outline bg-surface text-neutral-dark placeholder:text-neutral-gray/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent ${
          compact ? "px-3 py-2 text-sm" : "px-4 py-3"
        } ${className}`}
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

export function toneOf(color: string): { bg: string; text: string; border: string } {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((color || "").trim());
  if (!m) return { bg: "rgba(107,114,128,0.14)", text: "#374151", border: "rgba(107,114,128,0.4)" };
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const k = lum > 0.62 ? 0.42 : lum > 0.45 ? 0.68 : 1;
  const alpha = lum > 0.62 ? 0.3 : 0.16;
  return {
    bg: `rgba(${r}, ${g}, ${b}, ${alpha})`,
    text:
      k === 1
        ? `rgb(${r}, ${g}, ${b})`
        : `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`,
    border: `rgba(${r}, ${g}, ${b}, ${lum > 0.62 ? 0.6 : 0.4})`,
  };
}

export function Chip({
  color,
  children,
  size = "md",
}: {
  color: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const t = toneOf(color);
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1 text-base",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold whitespace-nowrap ${sizes[size]}`}
      style={{ backgroundColor: t.bg, color: t.text, boxShadow: `inset 0 0 0 1px ${t.border}` }}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-16 h-16 rounded-full bg-neutral-light flex items-center justify-center text-neutral-gray text-3xl mb-3">
        {icon}
      </div>
      <p className="font-semibold text-neutral-dark">{title}</p>
      {subtitle && <div className="text-sm text-neutral-gray mt-1">{subtitle}</div>}
      {action}
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
    <div
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md tab:max-w-2xl z-[70] animate-slide-up"
      style={{ top: "calc(var(--safe-top, 0px) + 16px)" }}
    >
      <div
        className={`rounded-xl px-4 py-3 shadow-xl text-sm font-medium flex items-start justify-between gap-3 ${styles[type]}`}
      >
        <span>{message}</span>
        {onDismiss && (
          <button onClick={onDismiss} className="shrink-0 opacity-80" aria-label="Cerrar">
            <CloseIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ProductImage({
  srcs,
  alt,
  className = "",
}: {
  srcs: string[];
  alt?: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const first = srcs[0];
  const lastFirst = useRef(first);
  if (lastFirst.current !== first) {
    lastFirst.current = first;
    setIndex(0);
  }
  const current = srcs[index];
  if (!current) return null;
  return (
    <img
      src={current}
      alt={alt ?? ""}
      loading="lazy"
      className={className}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

export function ProductThumb({
  src,
  alt,
  className = "w-12 h-12 rounded-xl object-cover",
}: {
  src?: string | string[] | null;
  alt?: string;
  className?: string;
}) {
  const list = Array.isArray(src) ? src.filter((s) => !!s) : src ? [src] : [];
  const [index, setIndex] = useState(0);
  const first = list[0];
  const lastFirst = useRef(first);
  if (lastFirst.current !== first) {
    lastFirst.current = first;
    setIndex(0);
  }
  const current = list[index];
  if (!current) {
    return (
      <span className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-neutral-gray shrink-0">
        <RestaurantIcon className="w-6 h-6" />
      </span>
    );
  }
  return (
    <img
      src={current}
      alt={alt ?? ""}
      loading="lazy"
      className={`${className} bg-background shrink-0`}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

export function formatMoney(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "$0";
  return `$${num.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Bogota",
    });
  } catch {
    return iso;
  }
}