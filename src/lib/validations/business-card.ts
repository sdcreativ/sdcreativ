import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), "URL http(s) attendue.")
  .optional()
  .default("");

const flag = z.boolean().optional();

export const businessCardFieldsSchema = z.object({
  jobTitle: optionalText(200),
  department: optionalText(120),
  company: optionalText(120),
  whatsapp: optionalText(32),
  website: optionalUrl,
  linkedin: optionalUrl,
  github: optionalUrl,
  instagram: optionalUrl,
  twitter: optionalUrl,
  location: optionalText(160),
  languages: optionalText(200),
  bio: optionalText(2000),
  skills: optionalText(500),
  services: optionalText(500),
  showPhone: flag,
  showWhatsapp: flag,
  showEmail: flag,
  showWebsite: flag,
  showLinkedin: flag,
  showGithub: flag,
  showInstagram: flag,
  showTwitter: flag,
  showLocation: flag,
  showBio: flag,
  showSkills: flag,
  showServices: flag,
  showPhoto: flag,
  active: flag,
  indexable: flag,
});

export const createBusinessCardSchema = businessCardFieldsSchema.extend({
  userId: z.string().uuid(),
});

export type BusinessCardFields = z.infer<typeof businessCardFieldsSchema>;
