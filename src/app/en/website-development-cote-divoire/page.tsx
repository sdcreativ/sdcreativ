import { getLocalSeoPage } from "@/content/local-seo";
import {
  createLocalSeoMetadata,
  LocalSeoPageView,
} from "@/components/pages/LocalSeoPageView";

const page = getLocalSeoPage("creation-site-cote-ivoire", "en")!;

export const metadata = createLocalSeoMetadata(page, "en");

export default function EnWebsiteDevelopmentCiPage() {
  return <LocalSeoPageView page={page} locale="en" />;
}
