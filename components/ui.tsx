import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border bg-card text-card-foreground shadow-finance", className)}
      {...props}
    />
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" && "bg-muted text-foreground hover:bg-muted/80",
        variant === "ghost" && "hover:bg-muted",
        variant === "danger" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "icon" && "h-10 w-10",
        className
      )}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
        props.className
      )}
    />
  );
}

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn("text-sm font-semibold", props.className)} />;
}
