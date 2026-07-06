import { getLocalSeoPage } from "@/content/local-seo";
import {
  createLocalSeoMetadata,
  LocalSeoPageView,
} from "@/components/pages/LocalSeoPageView";

const page = getLocalSeoPage("agence-web-abidjan")!;

export const metadata = createLocalSeoMetadata(page);

export default function AgenceWebAbidjanPage() {
  return <LocalSeoPageView page={page} />;
}
