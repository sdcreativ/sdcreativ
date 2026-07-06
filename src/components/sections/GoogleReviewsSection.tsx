import Link from "next/link";
import { Star, ExternalLink } from "lucide-react";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import {
  googleReviews,
  googleReviewsProfile,
} from "@/content/google-reviews";

const reviewUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL;

export function GoogleReviewsSection() {
  if (!reviewUrl) return null;

  return (
    <AnimatedSection className="bg-white py-20 md:py-28" id="avis-google">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow={googleReviewsProfile.label}
          title="Ce que disent"
          highlight="nos clients"
          description={`Note moyenne ${googleReviewsProfile.rating}/5 basée sur ${googleReviewsProfile.reviewCount} avis.`}
          className="mb-14"
        />

        <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-6 w-6 fill-amber-400 text-amber-400" aria-hidden />
            ))}
          </div>
          <p className="text-lg font-bold text-foreground">
            {googleReviewsProfile.rating}{" "}
            <span className="font-normal text-gray-text">/ 5</span>
          </p>
          {reviewUrl && (
            <Button href={reviewUrl} external variant="ghost" size="sm">
              Voir tous les avis Google
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {googleReviews.map((review, i) => (
            <AnimatedCard
              key={review.id}
              delay={i * 0.08}
              className="rounded-2xl border border-gray/60 bg-gray-light/30 p-6"
            >
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground/85">
                &ldquo;{review.text}&rdquo;
              </p>
              <footer className="mt-4 border-t border-gray/40 pt-4">
                <p className="text-sm font-bold text-foreground">{review.author}</p>
                <p className="text-xs text-gray-text">
                  {new Date(review.date).toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </footer>
            </AnimatedCard>
          ))}
        </div>

        {reviewUrl && (
          <p className="mt-10 text-center">
            <Link
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Laisser un avis sur Google →
            </Link>
          </p>
        )}
      </div>
    </AnimatedSection>
  );
}
