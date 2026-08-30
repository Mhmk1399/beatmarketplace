import {
  DiscIcon,
  FileTextIcon,
  GridIcon,
  MoodIcon,
  PianoIcon,
  SettingsIcon,
  StoreIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { DashboardIconName } from "@/lib/dashboard/navigation";

const icons = {
  overview: GridIcon,
  profile: UserIcon,
  settings: SettingsIcon,
  tracks: DiscIcon,
  contracts: FileTextIcon,
  store: StoreIcon,
  users: UsersIcon,
  genres: TagIcon,
  moods: MoodIcon,
  instruments: PianoIcon,
} satisfies Record<DashboardIconName, typeof GridIcon>;

export function DashboardIcon({ className, name }: { className?: string; name: DashboardIconName }) {
  const Icon = icons[name];
  return <Icon className={className} />;
}
