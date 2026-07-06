import { MapPin } from "lucide-react";
import { CONTACT } from "@/lib/constants";

export function ContactMap() {
  const query = encodeURIComponent(`${CONTACT.address}`);

  return (
    <div className="overflow-hidden rounded-3xl border border-gray/60 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray/60 px-6 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light">
          <MapPin className="h-4 w-4 text-primary" aria-hidden />
        </span>
        <div>
          <h3 className="font-bold text-foreground">Notre localisation</h3>
          <p className="text-sm text-gray-text">{CONTACT.address}</p>
        </div>
      </div>
      <div className="relative aspect-[16/9] w-full bg-gray-light md:aspect-[21/9]">
        <iframe
          title={`Carte — ${CONTACT.address}`}
          src={`https://maps.google.com/maps?q=${query}&z=12&output=embed`}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}
