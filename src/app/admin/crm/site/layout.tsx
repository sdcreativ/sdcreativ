import { CrmSiteSubNav } from "@/components/admin/CrmSiteSubNav";

export default function CrmSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <CrmSiteSubNav />
      {children}
    </div>
  );
}
