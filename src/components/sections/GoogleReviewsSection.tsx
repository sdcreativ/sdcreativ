import Link from "next/link";
import { Star, ExternalLink } from "lucide-react";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getGooglePlaceReviews, isGooglePlacesConfigured } from "@/lib/google-places-reviews";

const reviewUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL;

export async function GoogleReviewsSection() {
  if (!reviewUrl && !isGooglePlacesConfigured()) return null;

  const payload = isGooglePlacesConfigured()
    ? await getGooglePlaceReviews()
    : { rating: 0, reviewCount: 0, reviews: [], source: "unavailable" as const };

  const hasReviews = payload.source === "google" && payload.reviews.length > 0;
  const hasRating = payload.source === "google" && payload.rating > 0;

  if (!hasReviews && !reviewUrl) return null;

  return (
    <AnimatedSection className="bg-white py-20 md:py-28" id="avis-google">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Avis Google"
          title="Ce que disent"
          highlight="nos clients"
          description={
            hasRating
              ? `Note moyenne ${payload.rating.toFixed(1)}/5 basée sur ${payload.reviewCount} avis Google.`
              : "Consultez nos avis clients sur Google ou partagez votre expérience."
          }
          className="mb-10"
        />

        <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="flex items-center gap-2" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={
                  hasRating && i < Math.round(payload.rating)
                    ? "h-6 w-6 fill-amber-400 text-amber-400"
                    : "h-6 w-6 fill-amber-400/30 text-amber-400/30"
                }
              />
            ))}
          </div>
          {hasRating && (
            <p className="text-lg font-bold text-foreground">
              {payload.rating.toFixed(1)}{" "}
              <span className="font-normal text-gray-text">/ 5</span>
            </p>
          )}
          {reviewUrl && (
            <Button href={reviewUrl} external size="sm">
              Voir les avis Google
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </div>

        {hasReviews && (
          <div className="grid gap-6 md:grid-cols-3">
            {payload.reviews.slice(0, 3).map((review, i) => (
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
        )}

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
