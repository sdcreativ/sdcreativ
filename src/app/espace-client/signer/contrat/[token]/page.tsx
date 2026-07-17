import { ContractNativeSignView } from "@/components/espace-client/ContractNativeSignView";

type Props = { params: Promise<{ token: string }> };

export default async function ContractNativeSignPage({ params }: Props) {
  const { token } = await params;
  return <ContractNativeSignView token={token} />;
}
