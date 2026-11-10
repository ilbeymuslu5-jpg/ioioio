import {
  GlassWater,
  Layers,
  Leaf,
  Package,
  Recycle,
  Shapes,
  Shirt,
  TreePine,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CategorySlug } from "@/lib/categories";

const icons: Record<CategorySlug, LucideIcon> = {
  palet: Layers,
  ahsap: TreePine,
  plastik: Recycle,
  "kagit-karton": Package,
  tekstil: Shirt,
  metal: Wrench,
  cam: GlassWater,
  organik: Leaf,
  diger: Shapes,
};

type CategoryIconProps = {
  slug: CategorySlug;
  className?: string;
};

export function CategoryIcon({ slug, className }: CategoryIconProps) {
  const Icon = icons[slug];
  return <Icon aria-hidden="true" className={className} />;
}
