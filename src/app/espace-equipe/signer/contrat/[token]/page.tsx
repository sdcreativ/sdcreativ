import { EmployeeContractNativeSignView } from "@/components/espace-equipe/EmployeeContractNativeSignView";

type Props = { params: Promise<{ token: string }> };

export default async function EmployeeContractNativeSignPage({ params }: Props) {
  const { token } = await params;
  return <EmployeeContractNativeSignView token={token} />;
}
