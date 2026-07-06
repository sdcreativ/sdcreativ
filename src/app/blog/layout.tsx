import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  alternates: {
    types: {
      "application/rss+xml": `${SITE.url}/blog/feed.xml`,
    },
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
