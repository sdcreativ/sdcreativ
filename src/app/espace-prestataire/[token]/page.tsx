import { VendorPortalView } from "@/components/espace-prestataire/VendorPortalView";

type Props = { params: Promise<{ token: string }> };

export default async function EspacePrestatairePage({ params }: Props) {
  const { token } = await params;
  return <VendorPortalView token={token} />;
}
