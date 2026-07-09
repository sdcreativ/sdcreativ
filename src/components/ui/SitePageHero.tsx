import { getPageHeroConfig } from "@/lib/site-page-heroes-settings";
import type { PageHeroKey } from "@/lib/site-page-heroes-types";
import { PageHero } from "@/components/ui/PageHero";

type Props = {
  pageKey: PageHeroKey;
};

export async function SitePageHero({ pageKey }: Props) {
  const config = await getPageHeroConfig(pageKey);
  return <PageHero {...config} />;
}
