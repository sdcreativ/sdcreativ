import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Présentation tablette",
  robots: { index: false, follow: false },
};

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#071525]">
      {children}
    </div>
  );
}
