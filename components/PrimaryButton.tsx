import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
};

export function PrimaryButton({
  children,
  className = "",
  variant = "primary",
  fullWidth = false,
  ...props
}: PrimaryButtonProps) {
  const base =
    "font-heading focus-ring inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-[0.95rem] font-semibold transition active:scale-[0.99] sm:min-h-12 sm:text-base disabled:cursor-not-allowed disabled:opacity-55";

  const styles =
    variant === "primary"
      ? "bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]"
      : "bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[#e2e6ee]";

  return (
    <button className={`${base} ${styles} ${fullWidth ? "w-full" : ""} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}