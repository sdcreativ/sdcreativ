import { PresentationApp } from "@/components/presentation/PresentationApp";
import { getQuoteConfig } from "@/lib/quote-config-resolver";

export const dynamic = "force-dynamic";

export default async function PresentationPage() {
  const config = await getQuoteConfig();

  return <PresentationApp config={config} />;
}
