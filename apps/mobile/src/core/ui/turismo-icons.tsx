import type { LucideIcon, LucideProps } from "lucide-react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import Bike from "lucide-react-native/icons/bike";
import Camera from "lucide-react-native/icons/camera";
import Bookmark from "lucide-react-native/icons/bookmark";
import Bot from "lucide-react-native/icons/bot";
import BriefcaseBusiness from "lucide-react-native/icons/briefcase-business";
import BusFront from "lucide-react-native/icons/bus-front";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import CarFront from "lucide-react-native/icons/car-front";
import Check from "lucide-react-native/icons/check";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronUp from "lucide-react-native/icons/chevron-up";
import CircleHelp from "lucide-react-native/icons/circle-question-mark";
import Compass from "lucide-react-native/icons/compass";
import Coffee from "lucide-react-native/icons/coffee";
import CornerUpLeft from "lucide-react-native/icons/corner-up-left";
import CornerUpRight from "lucide-react-native/icons/corner-up-right";
import Download from "lucide-react-native/icons/download";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import Flag from "lucide-react-native/icons/flag";
import Footprints from "lucide-react-native/icons/footprints";
import History from "lucide-react-native/icons/rotate-ccw-clock";
import Hotel from "lucide-react-native/icons/hotel";
import Image from "lucide-react-native/icons/image";
import Landmark from "lucide-react-native/icons/landmark";
import LocateFixed from "lucide-react-native/icons/locate-fixed";
import LogOut from "lucide-react-native/icons/log-out";
import Mars from "lucide-react-native/icons/mars";
import Map from "lucide-react-native/icons/map";
import MapPin from "lucide-react-native/icons/map-pin";
import MapPinned from "lucide-react-native/icons/map-pinned";
import Mic from "lucide-react-native/icons/mic";
import Menu from "lucide-react-native/icons/menu";
import MessageCircle from "lucide-react-native/icons/message-circle";
import Moon from "lucide-react-native/icons/moon";
import Navigation from "lucide-react-native/icons/navigation";
import Pencil from "lucide-react-native/icons/pencil";
import Plus from "lucide-react-native/icons/plus";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Redo2 from "lucide-react-native/icons/redo-2";
import Route from "lucide-react-native/icons/route";
import Search from "lucide-react-native/icons/search";
import Send from "lucide-react-native/icons/send";
import Settings from "lucide-react-native/icons/settings";
import Share2 from "lucide-react-native/icons/share-2";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import Sparkles from "lucide-react-native/icons/sparkles";
import Star from "lucide-react-native/icons/star";
import Store from "lucide-react-native/icons/store";
import Sun from "lucide-react-native/icons/sun";
import SunMoon from "lucide-react-native/icons/sun-moon";
import Ticket from "lucide-react-native/icons/ticket";
import Undo2 from "lucide-react-native/icons/undo-2";
import Utensils from "lucide-react-native/icons/utensils";
import Wine from "lucide-react-native/icons/wine";
import UserRound from "lucide-react-native/icons/user-round";
import Users from "lucide-react-native/icons/users";
import Venus from "lucide-react-native/icons/venus";
import Volume2 from "lucide-react-native/icons/volume-2";
import VolumeX from "lucide-react-native/icons/volume-x";
import WifiOff from "lucide-react-native/icons/wifi-off";
import X from "lucide-react-native/icons/x";

import { turismoIconSizes, turismoIconStrokes } from "./tokens";

const turismoIconMap = {
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  arrowUp: ArrowUp,
  bike: Bike,
  camera: Camera,
  bookmark: Bookmark,
  bot: Bot,
  briefcase: BriefcaseBusiness,
  bus: BusFront,
  calendar: CalendarDays,
  car: CarFront,
  check: Check,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  circleHelp: CircleHelp,
  help: CircleHelp,
  compass: Compass,
  coffee: Coffee,
  cornerUpLeft: CornerUpLeft,
  cornerUpRight: CornerUpRight,
  download: Download,
  eye: Eye,
  eyeOff: EyeOff,
  flag: Flag,
  foot: Footprints,
  history: History,
  image: Image,
  locate: LocateFixed,
  logOut: LogOut,
  genderMale: Mars,
  genderFemale: Venus,
  hotel: Hotel,
  landmark: Landmark,
  map: Map,
  mapPin: MapPin,
  mapPinned: MapPinned,
  menu: Menu,
  microphone: Mic,
  message: MessageCircle,
  moon: Moon,
  navigation: Navigation,
  pencil: Pencil,
  plus: Plus,
  refresh: RefreshCw,
  redo: Redo2,
  route: Route,
  search: Search,
  send: Send,
  settings: Settings,
  share: Share2,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  star: Star,
  store: Store,
  sun: Sun,
  sunMoon: SunMoon,
  ticket: Ticket,
  undo: Undo2,
  restaurant: Utensils,
  wine: Wine,
  user: UserRound,
  users: Users,
  volume: Volume2,
  volumeOff: VolumeX,
  wifiOff: WifiOff,
  close: X,
} as const satisfies Record<string, LucideIcon>;

export type TurismoIconName = keyof typeof turismoIconMap;

export function TurismoIcon({
  name,
  size = turismoIconSizes.md,
  color = "currentColor",
  strokeWidth = turismoIconStrokes.regular,
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
