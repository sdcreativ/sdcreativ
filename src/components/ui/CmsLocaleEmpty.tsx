import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Props = {
  title: string;
  description: string;
  className?: string;
};

/** Empty state EN quand le CMS n’a pas encore de contenu `locale=en`. */
export function CmsLocaleEmpty({ title, description, className }: Props) {
  return (
    <div
      className={
        className ??
        "mx-auto max-w-xl rounded-2xl border border-gray/60 bg-white px-8 py-12 text-center shadow-sm"
      }
    >
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-text">{description}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href="/en/devis">Get a quote</Button>
        <Button href="/en/contact" variant="ghost">
          Contact us
        </Button>
      </div>
      <p className="mt-6 text-xs text-gray-text">
        Prefer French content?{" "}
        <Link href="/" className="font-semibold text-primary hover:underline">
          Switch to the French site →
        </Link>
      </p>
    </div>
  );
}
