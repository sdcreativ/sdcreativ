import { AdminInvitationView } from "@/components/admin/AdminInvitationView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activation compte CRM",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function AdminInvitationPage({ params }: Props) {
  const { token } = await params;
  return <AdminInvitationView token={token} />;
}
