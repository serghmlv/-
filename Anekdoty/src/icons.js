import { Cloud, Clapperboard, Dumbbell, Figma, Music, Palette, Sparkles, Star, Youtube, Zap } from "lucide-react";

export const ICON_OPTIONS = [
  { id: "netflix", Icon: Clapperboard, tint: "from-red-500/30 to-red-900/10", fg: "text-red-300" },
  { id: "spotify", Icon: Music, tint: "from-emerald-400/30 to-emerald-900/10", fg: "text-emerald-300" },
  { id: "icloud", Icon: Cloud, tint: "from-sky-400/30 to-blue-900/10", fg: "text-sky-300" },
  { id: "youtube", Icon: Youtube, tint: "from-red-400/25 to-rose-900/10", fg: "text-red-300" },
  { id: "ai", Icon: Sparkles, tint: "from-violet-400/30 to-indigo-900/10", fg: "text-violet-300" },
  { id: "adobe", Icon: Palette, tint: "from-rose-400/30 to-orange-900/10", fg: "text-rose-300" },
  { id: "plus", Icon: Star, tint: "from-amber-300/30 to-yellow-900/10", fg: "text-amber-200" },
  { id: "figma", Icon: Figma, tint: "from-fuchsia-400/30 to-purple-900/10", fg: "text-fuchsia-300" },
  { id: "gym", Icon: Dumbbell, tint: "from-lime-400/25 to-emerald-900/10", fg: "text-lime-300" },
  { id: "power", Icon: Zap, tint: "from-champagne/30 to-amber-900/10", fg: "text-champagne" },
];

export function iconMeta(id) {
  return ICON_OPTIONS.find((i) => i.id === id) || ICON_OPTIONS[0];
}

export function guessIcon(name) {
  const n = name.toLowerCase();
  if (n.includes("netflix")) return "netflix";
  if (n.includes("spotify")) return "spotify";
  if (n.includes("icloud") || n.includes("apple") || n.includes("cloud")) return "icloud";
  if (n.includes("youtube") || n.includes("youtub")) return "youtube";
  if (n.includes("gpt") || n.includes("openai") || n.includes("claude") || n.includes("ai")) return "ai";
  if (n.includes("adobe") || n.includes("photoshop")) return "adobe";
  if (n.includes("яндекс") || n.includes("yandex") || n.includes("plus")) return "plus";
  if (n.includes("figma")) return "figma";
  if (n.includes("зал") || n.includes("gym") || n.includes("fit")) return "gym";
  if (n.includes("свет") || n.includes("жкх") || n.includes("коммун") || n.includes("электро")) return "power";
  return "plus";
}
