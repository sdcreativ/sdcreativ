import { getTestimonials } from "@/lib/public-testimonials-resolver";
import { TestimonialsCarousel } from "@/components/sections/TestimonialsCarousel";

type Props = {
  locale?: "fr" | "en";
};

export async function TestimonialsSection({ locale = "fr" }: Props) {
  const testimonials = await getTestimonials(locale);
  return <TestimonialsCarousel testimonials={testimonials} />;
}
