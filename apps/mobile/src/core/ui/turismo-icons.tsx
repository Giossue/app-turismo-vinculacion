import type { LucideIcon, LucideProps } from "lucide-react-native";
import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Compass,
  LocateFixed,
  Map,
  MapPin,
  MapPinned,
  Menu,
  MessageCircle,
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
  UserRound,
  WifiOff,
  X,
} from "lucide-react-native";

export const turismoIconMap = {
  arrowLeft: ArrowLeft,
  bookmark: Bookmark,
  calendar: CalendarDays,
  car: CarFront,
  check: Check,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  help: CircleHelp,
  compass: Compass,
  locate: LocateFixed,
  map: Map,
  mapPin: MapPin,
  mapPinned: MapPinned,
  menu: Menu,
  message: MessageCircle,
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
