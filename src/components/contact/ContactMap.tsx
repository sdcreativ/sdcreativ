import { getSitePublicSettings } from "@/lib/site-public-settings";

export async function ContactMap() {
  const { contact } = await getSitePublicSettings();
  const query = encodeURIComponent(`${contact.address}`);
  const src = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="overflow-hidden rounded-3xl border border-gray/40 bg-white shadow-sm">
      <div className="border-b border-gray/30 px-6 py-4">
        <h2 className="text-lg font-bold text-foreground">Nous trouver</h2>
        <p className="text-sm text-gray-text">{contact.address}</p>
      </div>
      <div className="aspect-[16/9] w-full sm:aspect-[21/9]">
        <iframe
          src={src}
          title={`Carte — ${contact.address}`}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}
