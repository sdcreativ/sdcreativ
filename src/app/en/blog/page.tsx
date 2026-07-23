import { redirect } from "next/navigation";

/** English blog is not ready — avoid indexing a stub. */
export const metadata = {
  robots: { index: false, follow: false },
};

export default function EnBlogPage() {
  redirect("/blog");
}
