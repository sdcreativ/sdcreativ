import { cn } from "@/lib/utils";
import { resolveImageDisplayUrl } from "@/lib/image-url";

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-20 w-20 text-xl",
} as const;

export function crmUserInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function CrmUserAvatar({ name, avatarUrl, size = "md", className }: Props) {
  const initials = crmUserInitials(name);
  const displayUrl = avatarUrl ? resolveImageDisplayUrl(avatarUrl) : null;

  if (displayUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displayUrl}
        alt=""
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-white/10",
          sizeClass[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white ring-2 ring-white/10",
        sizeClass[size],
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
