import {
  Accessibility,
  Award,
  Bot,
  Brain,
  Cloud,
  Code2,
  Database,
  Ear,
  GitBranch,
  Globe,
  Handshake,
  Headphones,
  HelpCircle,
  Lightbulb,
  LineChart,
  MapPin,
  MessageSquare,
  Palette,
  PenTool,
  RefreshCw,
  Rocket,
  Search,
  Shield,
  ShoppingCart,
  Smartphone,
  Target,
  TrendingUp,
  Workflow,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const LUCIDE_ICON_MAP = {
  Accessibility,
  Award,
  Bot,
  Brain,
  Cloud,
  Code2,
  Database,
  Ear,
  GitBranch,
  Globe,
  Handshake,
  Headphones,
  HelpCircle,
  Lightbulb,
  LineChart,
  MapPin,
  MessageSquare,
  Palette,
  PenTool,
  RefreshCw,
  Rocket,
  Search,
  Shield,
  ShoppingCart,
  Smartphone,
  Target,
  TrendingUp,
  Workflow,
  Wrench,
  Zap,
} as const satisfies Record<string, LucideIcon>;

export type LucideIconName = keyof typeof LUCIDE_ICON_MAP;

export const LUCIDE_ICON_NAMES = Object.keys(LUCIDE_ICON_MAP) as LucideIconName[];

export const LUCIDE_ICON_NAME_ENUM = LUCIDE_ICON_NAMES as [LucideIconName, ...LucideIconName[]];

export function getLucideIcon(name: string): LucideIcon {
  return LUCIDE_ICON_MAP[name as LucideIconName] ?? HelpCircle;
}

export function lucideIconName(icon: LucideIcon): LucideIconName {
  const match = LUCIDE_ICON_NAMES.find((name) => LUCIDE_ICON_MAP[name] === icon);
  return match ?? "HelpCircle";
}
