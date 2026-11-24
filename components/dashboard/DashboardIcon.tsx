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
  LayersIcon,
  UploadIcon,
  CalendarIcon,
  BoltIcon,
  ShieldIcon,
  SlidersIcon,
  MonitorIcon,
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
  files: UploadIcon,
  collections: LayersIcon,
  photos: MonitorIcon,
  promote: BoltIcon,
  finances: CalendarIcon,
  analytics: GridIcon,
  rights: ShieldIcon,
  integrations: SlidersIcon,
} satisfies Record<DashboardIconName, typeof GridIcon>;

export function DashboardIcon({ className, name }: { className?: string; name: DashboardIconName }) {
  const Icon = icons[name];
  return <Icon className={className} />;
}
