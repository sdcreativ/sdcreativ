/** Valeurs brutes stockées en base (crm_settings.site_public). */
export type SitePublicSettings = {
  /** Raison sociale affichée sur factures et documents */
  companyName: string;
  /** Slogan / activité */
  tagline: string;
  /** Logo (URL absolue ou chemin /images/…) */
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  whatsapp: string;
  whatsappMessage: string;
  facebook: string;
  linkedin: string;
  instagram: string;
  youtube: string;
  rccm: string;
  ncc: string;
  hostName: string;
  hostAddress: string;
};

export type SiteContactInfo = {
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  hours: string;
  whatsapp: string;
  whatsappMessage: string;
};

export type SiteSocialLinks = {
  facebook: string;
  linkedin: string;
  instagram: string;
  youtube: string;
};

export type SiteLegalInfo = {
  rccm: string;
  ncc: string;
  hostName: string;
  hostAddress: string;
};

export type ResolvedSitePublic = {
  companyName: string;
  tagline: string;
  logoUrl: string;
  contact: SiteContactInfo;
  social: SiteSocialLinks;
  legal: SiteLegalInfo;
  /** true si des valeurs proviennent de la base (admin) */
  fromDatabase: boolean;
};
