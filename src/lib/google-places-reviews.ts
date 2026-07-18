import { unstable_cache } from "next/cache";

export type GooglePlaceReview = {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
};

export type GooglePlaceReviewsPayload = {
  rating: number;
  reviewCount: number;
  reviews: GooglePlaceReview[];
  source: "google" | "unavailable";
};

type PlacesDetailsResponse = {
  result?: {
    rating?: number;
    user_ratings_total?: number;
    reviews?: Array<{
      author_name?: string;
      rating?: number;
      time?: number;
      text?: string;
      author_url?: string;
    }>;
  };
  status?: string;
  error_message?: string;
};

async function fetchGooglePlaceReviewsUncached(): Promise<GooglePlaceReviewsPayload> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();

  if (!apiKey || !placeId) {
    return { rating: 0, reviewCount: 0, reviews: [], source: "unavailable" };
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "rating,user_ratings_total,reviews");
  url.searchParams.set("language", "fr");
  url.searchParams.set("reviews_sort", "newest");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 21_600 } });
  if (!res.ok) {
    console.error("[google-places] HTTP", res.status);
    return { rating: 0, reviewCount: 0, reviews: [], source: "unavailable" };
  }

  const data = (await res.json()) as PlacesDetailsResponse;
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[google-places] status", data.status, data.error_message);
    return { rating: 0, reviewCount: 0, reviews: [], source: "unavailable" };
  }

  const reviews = (data.result?.reviews ?? [])
    .filter((r) => r.text?.trim() && r.author_name)
    .slice(0, 6)
    .map((r, i) => ({
      id: `gr-${r.time ?? i}`,
      author: r.author_name!.trim(),
      rating: Math.min(5, Math.max(1, Number(r.rating ?? 5))),
      date: r.time
        ? new Date(r.time * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      text: r.text!.trim(),
    }));

  return {
    rating: Number(data.result?.rating ?? 0),
    reviewCount: Number(data.result?.user_ratings_total ?? reviews.length),
    reviews,
    source: "google",
  };
}

export const getGooglePlaceReviews = unstable_cache(
  fetchGooglePlaceReviewsUncached,
  ["google-place-reviews"],
  { revalidate: 21_600, tags: ["google-reviews"] },
);

export function isGooglePlacesConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_PLACES_API_KEY?.trim() && process.env.GOOGLE_PLACE_ID?.trim(),
  );
}
