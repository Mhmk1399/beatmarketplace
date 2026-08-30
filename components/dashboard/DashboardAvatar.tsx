import { cn } from "@/lib/cn";
import type { DashboardUser } from "@/lib/dashboard/session";

export function getUserName(user: DashboardUser) {
  return user.profile.displayName || `${user.firstName} ${user.lastName}`.trim();
}

export function DashboardAvatar({ className, user }: { className?: string; user: DashboardUser }) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || "BM";
  const style = user.profile.avatarUrl ? { backgroundImage: `url(${JSON.stringify(user.profile.avatarUrl)})` } : undefined;

  return (
    <span
      className={cn("dashboard-avatar neo-inset flex shrink-0 items-center justify-center rounded-full bg-cover bg-center text-xs font-black text-[#d8b4fe]", className)}
      style={style}
      aria-hidden="true"
    >
      {!user.profile.avatarUrl && initials}
    </span>
  );
}
