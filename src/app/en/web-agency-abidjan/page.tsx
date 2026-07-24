import { getLocalSeoPage } from "@/content/local-seo";
import {
  createLocalSeoMetadata,
  LocalSeoPageView,
} from "@/components/pages/LocalSeoPageView";

const page = getLocalSeoPage("agence-web-abidjan", "en")!;

export const metadata = createLocalSeoMetadata(page, "en");

export default function EnWebAgencyAbidjanPage() {
  return <LocalSeoPageView page={page} locale="en" />;
}
