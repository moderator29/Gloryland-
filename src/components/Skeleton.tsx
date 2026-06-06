type Props = {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
};

export function Skeleton({ className = "", rounded = "xl" }: Props) {
  const r = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    "3xl": "rounded-3xl",
    full: "rounded-full",
  }[rounded];
  return (
    <div aria-hidden className={`relative overflow-hidden ${r} bg-white/[0.04] ${className}`}>
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}
