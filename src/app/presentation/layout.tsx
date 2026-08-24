import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Présentation tablette",
  description: "Interface de présentation commerciale SD CREATIV.",
  path: "/presentation",
  noIndex: true,
});

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#071525]">{children}</div>;
}
