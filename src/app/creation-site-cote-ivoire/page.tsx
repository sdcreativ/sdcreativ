import { getLocalSeoPage } from "@/content/local-seo";
import {
  createLocalSeoMetadata,
  LocalSeoPageView,
} from "@/components/pages/LocalSeoPageView";

const page = getLocalSeoPage("creation-site-cote-ivoire")!;

export const metadata = createLocalSeoMetadata(page);

export default function CreationSiteCoteIvoirePage() {
  return <LocalSeoPageView page={page} />;
}
