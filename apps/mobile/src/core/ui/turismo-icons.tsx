import type { LucideIcon, LucideProps } from "lucide-react-native";
import {
  ArrowLeft,
  Bike,
  Bookmark,
  Bot,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Compass,
  Download,
  Footprints,
  LocateFixed,
  Map,
  MapPin,
  MapPinned,
  Menu,
  MessageCircle,
  Moon,
  Navigation,
  Plus,
  RefreshCw,
  Route,
  Search,
  Send,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  UserRound,
  WifiOff,
  X,
} from "lucide-react-native";

export const turismoIconMap = {
  arrowLeft: ArrowLeft,
  bike: Bike,
  bookmark: Bookmark,
  bot: Bot,
  calendar: CalendarDays,
  car: CarFront,
  check: Check,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  circleHelp: CircleHelp,
  help: CircleHelp,
  compass: Compass,
  download: Download,
  foot: Footprints,
  locate: LocateFixed,
  map: Map,
  mapPin: MapPin,
  mapPinned: MapPinned,
  menu: Menu,
  message: MessageCircle,
  moon: Moon,
  navigation: Navigation,
  plus: Plus,
  refresh: RefreshCw,
  route: Route,
  search: Search,
  send: Send,
  settings: Settings,
  share: Share2,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  user: UserRound,
  wifiOff: WifiOff,
  close: X,
} as const satisfies Record<string, LucideIcon>;

export type TurismoIconName = keyof typeof turismoIconMap;

export function TurismoIcon({
  name,
  size = 22,
  color = "currentColor",
  strokeWidth = 2,
  ...props
}: Readonly<{ name: TurismoIconName } & Omit<LucideProps, "ref">>) {
  const Icon = turismoIconMap[name];
  return (
    <Icon
      aria-hidden
      color={color}
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}
