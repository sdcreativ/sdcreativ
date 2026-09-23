import { withDb } from "@/lib/db";
import { logCrmAudit, type AuditActor } from "@/lib/crm-audit";
import {
  businessCardPublicUrl,
  deviceTypeFromUserAgent,
  generatePublicToken,
  safeCountryCode,
  safeReferrer,
  toPublicBusinessCard,
  type BusinessCardSource,
  type CardVisibility,
  type PublicBusinessCard,
} from "@/lib/business-card-public";
import type { BusinessCardFields } from "@/lib/validations/business-card";

type CardRow = {
  id: string;
  user_id: string;
  public_token: string;
  active: boolean;
  indexable: boolean;
  job_title: string;
  department: string;
  company: string;
  whatsapp: string;
  website: string;
  linkedin: string;
  github: string;
  instagram: string;
  twitter: string;
  location: string;
  languages: string;
  bio: string;
  skills: string;
  services: string;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_email: boolean;
  show_website: boolean;
  show_linkedin: boolean;
  show_github: boolean;
  show_instagram: boolean;
  show_twitter: boolean;
  show_location: boolean;
  show_bio: boolean;
  show_skills: boolean;
  show_services: boolean;
  show_photo: boolean;
  created_at: Date;
  updated_at: Date;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  avatar_url: string | null;
  view_count: string | number;
};

export type BusinessCardRecord = CardVisibility & {
  id: string;
  userId: string;
  publicToken: string;
  publicUrl: string;
  active: boolean;
  indexable: boolean;
  name: string;
  email: string;
  phone: string;
  photoUrl: string;
  jobTitle: string;
  department: string;
  company: string;
  whatsapp: string;
  website: string;
  linkedin: string;
  github: string;
  instagram: string;
  twitter: string;
  location: string;
  languages: string;
  bio: string;
  skills: string;
  services: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BusinessCardStats = {
  total: number;
  today: number;
  days7: number;
  days30: number;
  mobile: number;
  tablet: number;
  desktop: number;
};

export type CardCandidate = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const SELECT_CARD = `
  SELECT c.*,
         u.name AS user_name,
         u.email AS user_email,
         u.phone AS user_phone,
         NULLIF(
           BTRIM(
             COALESCE(
               u.preferences #>> '{profile,avatarUrl}',
               u.preferences #>> '{avatarUrl}',
               u.preferences #>> '{profile,photoUrl}',
               (
                 SELECT t.image
                 FROM public_team_members t
                 WHERE lower(btrim(t.name)) = lower(btrim(u.name))
                   AND btrim(t.image) <> ''
                 ORDER BY t.is_visible DESC, t.sort_order ASC
                 LIMIT 1
               )
             )
           ),
           ''
         ) AS avatar_url,
         (SELECT COUNT(*) FROM business_card_views v WHERE v.business_card_id = c.id) AS view_count
  FROM digital_business_cards c
  JOIN crm_users u ON u.id = c.user_id
`;

function mapRow(row: CardRow): BusinessCardRecord {
  return {
    id: row.id,
    userId: row.user_id,
    publicToken: row.public_token,
    publicUrl: businessCardPublicUrl(row.public_token),
    active: row.active,
    indexable: row.indexable,
    name: row.user_name,
    email: row.user_email,
    phone: row.user_phone ?? "",
    photoUrl: row.avatar_url ?? "",
    jobTitle: row.job_title,
    department: row.department,
    company: row.company,
    whatsapp: row.whatsapp,
    website: row.website,
    linkedin: row.linkedin,
    github: row.github,
    instagram: row.instagram,
    twitter: row.twitter,
    location: row.location,
    languages: row.languages,
    bio: row.bio,
    skills: row.skills,
    services: row.services,
    showPhone: row.show_phone,
    showWhatsapp: row.show_whatsapp,
    showEmail: row.show_email,
    showWebsite: row.show_website,
    showLinkedin: row.show_linkedin,
    showGithub: row.show_github,
    showInstagram: row.show_instagram,
    showTwitter: row.show_twitter,
    showLocation: row.show_location,
    showBio: row.show_bio,
    showSkills: row.show_skills,
    showServices: row.show_services,
    showPhoto: row.show_photo,
    viewCount: Number(row.view_count) || 0,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function recordToSource(record: BusinessCardRecord): BusinessCardSource {
  return {
    active: record.active,
    indexable: record.indexable,
    publicToken: record.publicToken,
    name: record.name,
    jobTitle: record.jobTitle,
    department: record.department,
    company: record.company,
    email: record.email,
    phone: record.phone,
    photoUrl: record.photoUrl,
    whatsapp: record.whatsapp,
    website: record.website,
    linkedin: record.linkedin,
    github: record.github,
    instagram: record.instagram,
    twitter: record.twitter,
    location: record.location,
    languages: record.languages,
    bio: record.bio,
    skills: record.skills,
    services: record.services,
    showPhone: record.showPhone,
    showWhatsapp: record.showWhatsapp,
    showEmail: record.showEmail,
    showWebsite: record.showWebsite,
    showLinkedin: record.showLinkedin,
    showGithub: record.showGithub,
    showInstagram: record.showInstagram,
    showTwitter: record.showTwitter,
    showLocation: record.showLocation,
    showBio: record.showBio,
    showSkills: record.showSkills,
    showServices: record.showServices,
    showPhoto: record.showPhoto,
  };
}

/** Profil public : uniquement les champs autorisés. */
export function getPublicBusinessCard(
  record: BusinessCardRecord,
): PublicBusinessCard | { status: "inactive" } {
  return toPublicBusinessCard(recordToSource(record));
}

function fieldValue(
  fields: Partial<BusinessCardFields>,
  key: keyof BusinessCardFields,
  fallback: string | boolean,
) {
  const value = fields[key];
  return value === undefined ? fallback : value;
}

export async function listBusinessCards(): Promise<BusinessCardRecord[]> {
  return withDb(async (query) => {
    const { rows } = await query<CardRow>(`${SELECT_CARD} ORDER BY u.name ASC`);
    return rows.map(mapRow);
  });
}

export async function getBusinessCardById(id: string): Promise<BusinessCardRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<CardRow>(`${SELECT_CARD} WHERE c.id = $1 LIMIT 1`, [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function getBusinessCardByUserId(userId: string): Promise<BusinessCardRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<CardRow>(`${SELECT_CARD} WHERE c.user_id = $1 LIMIT 1`, [userId]);
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function getBusinessCardByToken(token: string): Promise<BusinessCardRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<CardRow>(`${SELECT_CARD} WHERE c.public_token = $1 LIMIT 1`, [token]);
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function listCardCandidates(): Promise<CardCandidate[]> {
  return withDb(async (query) => {
    const { rows } = await query<CardCandidate>(
      `SELECT u.id, u.name, u.email, u.role
       FROM crm_users u
       WHERE u.active = true
         AND NOT EXISTS (SELECT 1 FROM digital_business_cards c WHERE c.user_id = u.id)
       ORDER BY u.name ASC`,
    );
    return rows;
  });
}

export async function listIndexableCardPaths(): Promise<Array<{ token: string; updatedAt: string }>> {
  return withDb(async (query) => {
    const { rows } = await query<{ public_token: string; updated_at: Date }>(
      `SELECT public_token, updated_at
       FROM digital_business_cards
       WHERE active = true AND indexable = true`,
    );
    return rows.map((row) => ({
      token: row.public_token,
      updatedAt: row.updated_at.toISOString(),
    }));
  });
}

export async function createBusinessCard(
  userId: string,
  fields: Partial<BusinessCardFields>,
  actor: AuditActor,
): Promise<BusinessCardRecord> {
  const record = await withDb(async (query) => {
    const existing = await query<{ id: string }>(
      `SELECT id FROM digital_business_cards WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (existing.rows[0]) {
      throw new Error("CARD_EXISTS");
    }

    const user = await query<{ id: string }>(
      `SELECT id FROM crm_users WHERE id = $1 AND active = true LIMIT 1`,
      [userId],
    );
    if (!user.rows[0]) {
      throw new Error("USER_NOT_FOUND");
    }

    let insertedId = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = generatePublicToken();
      try {
        const inserted = await query<{ id: string }>(
          `INSERT INTO digital_business_cards (
             user_id, public_token, active, indexable, job_title, department, company,
             whatsapp, website, linkedin, github, instagram, twitter, location, languages,
             bio, skills, services,
             show_phone, show_whatsapp, show_email, show_website, show_linkedin, show_github,
             show_instagram, show_twitter, show_location, show_bio, show_skills, show_services, show_photo
           ) VALUES (
             $1,$2,$3,$4,$5,$6,COALESCE(NULLIF($7, ''), 'SD CREATIV'),
             $8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
             $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
           )
           RETURNING id`,
          [
            userId,
            token,
            fieldValue(fields, "active", true),
            fieldValue(fields, "indexable", false),
            fields.jobTitle ?? "",
            fields.department ?? "",
            fields.company ?? "",
            fields.whatsapp ?? "",
            fields.website ?? "",
            fields.linkedin ?? "",
            fields.github ?? "",
            fields.instagram ?? "",
            fields.twitter ?? "",
            fields.location ?? "",
            fields.languages ?? "",
            fields.bio ?? "",
            fields.skills ?? "",
            fields.services ?? "",
            fieldValue(fields, "showPhone", true),
            fieldValue(fields, "showWhatsapp", false),
            fieldValue(fields, "showEmail", true),
            fieldValue(fields, "showWebsite", true),
            fieldValue(fields, "showLinkedin", false),
            fieldValue(fields, "showGithub", false),
            fieldValue(fields, "showInstagram", false),
            fieldValue(fields, "showTwitter", false),
            fieldValue(fields, "showLocation", false),
            fieldValue(fields, "showBio", true),
            fieldValue(fields, "showSkills", true),
            fieldValue(fields, "showServices", true),
            fieldValue(fields, "showPhoto", true),
          ],
        );
        insertedId = inserted.rows[0]!.id;
        break;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "23505" && attempt < 4) continue;
        throw error;
      }
    }

    const { rows } = await query<CardRow>(`${SELECT_CARD} WHERE c.id = $1`, [insertedId]);
    return mapRow(rows[0]!);
  });

  await logCrmAudit({
    actor,
    action: "business_card_created",
    entityType: "digital_business_card",
    entityId: record.id,
    summary: `Carte de visite créée pour ${record.name}`,
  });
  return record;
}

export async function updateBusinessCard(
  id: string,
  fields: BusinessCardFields,
  actor: AuditActor,
): Promise<BusinessCardRecord | null> {
  const record = await withDb(async (query) => {
    const current = await query<{ id: string }>(
      `SELECT id FROM digital_business_cards WHERE id = $1`,
      [id],
    );
    if (!current.rows[0]) return null;

    await query(
      `UPDATE digital_business_cards SET
         job_title = $2,
         department = $3,
         company = COALESCE(NULLIF($4, ''), 'SD CREATIV'),
         whatsapp = $5,
         website = $6,
         linkedin = $7,
         github = $8,
         instagram = $9,
         twitter = $10,
         location = $11,
         languages = $12,
         bio = $13,
         skills = $14,
         services = $15,
         show_phone = COALESCE($16, show_phone),
         show_whatsapp = COALESCE($17, show_whatsapp),
         show_email = COALESCE($18, show_email),
         show_website = COALESCE($19, show_website),
         show_linkedin = COALESCE($20, show_linkedin),
         show_github = COALESCE($21, show_github),
         show_instagram = COALESCE($22, show_instagram),
         show_twitter = COALESCE($23, show_twitter),
         show_location = COALESCE($24, show_location),
         show_bio = COALESCE($25, show_bio),
         show_skills = COALESCE($26, show_skills),
         show_services = COALESCE($27, show_services),
         show_photo = COALESCE($28, show_photo),
         active = COALESCE($29, active),
         indexable = COALESCE($30, indexable),
         updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        fields.jobTitle ?? "",
        fields.department ?? "",
        fields.company ?? "",
        fields.whatsapp ?? "",
        fields.website ?? "",
        fields.linkedin ?? "",
        fields.github ?? "",
        fields.instagram ?? "",
        fields.twitter ?? "",
        fields.location ?? "",
        fields.languages ?? "",
        fields.bio ?? "",
        fields.skills ?? "",
        fields.services ?? "",
        fields.showPhone ?? null,
        fields.showWhatsapp ?? null,
        fields.showEmail ?? null,
        fields.showWebsite ?? null,
        fields.showLinkedin ?? null,
        fields.showGithub ?? null,
        fields.showInstagram ?? null,
        fields.showTwitter ?? null,
        fields.showLocation ?? null,
        fields.showBio ?? null,
        fields.showSkills ?? null,
        fields.showServices ?? null,
        fields.showPhoto ?? null,
        fields.active ?? null,
        fields.indexable ?? null,
      ],
    );

    const { rows } = await query<CardRow>(`${SELECT_CARD} WHERE c.id = $1`, [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  });

  if (!record) return null;
  await logCrmAudit({
    actor,
    action: record.active ? "business_card_updated" : "business_card_disabled",
    entityType: "digital_business_card",
    entityId: record.id,
    summary: record.active
      ? `Carte de visite mise à jour (${record.name})`
      : `Carte de visite désactivée (${record.name})`,
  });
  return record;
}

export async function regenerateBusinessCardToken(
  id: string,
  actor: AuditActor,
): Promise<BusinessCardRecord | null> {
  const record = await withDb(async (query) => {
    const current = await query<{ id: string }>(
      `SELECT id FROM digital_business_cards WHERE id = $1`,
      [id],
    );
    if (!current.rows[0]) return null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await query(
          `UPDATE digital_business_cards
           SET public_token = $2, updated_at = NOW()
           WHERE id = $1`,
          [id, generatePublicToken()],
        );
        break;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "23505" && attempt < 4) continue;
        throw error;
      }
    }

    const { rows } = await query<CardRow>(`${SELECT_CARD} WHERE c.id = $1`, [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  });

  if (!record) return null;
  await logCrmAudit({
    actor,
    action: "business_card_token_regenerated",
    entityType: "digital_business_card",
    entityId: record.id,
    summary: `Lien public régénéré (${record.name})`,
  });
  return record;
}

export async function getBusinessCardStats(cardId: string): Promise<BusinessCardStats> {
  return withDb(async (query) => {
    const { rows } = await query<{
      total: string;
      today: string;
      days7: string;
      days30: string;
      mobile: string;
      tablet: string;
      desktop: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW()))::text AS today,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::text AS days7,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::text AS days30,
         COUNT(*) FILTER (WHERE device_type = 'mobile')::text AS mobile,
         COUNT(*) FILTER (WHERE device_type = 'tablet')::text AS tablet,
         COUNT(*) FILTER (WHERE device_type = 'desktop')::text AS desktop
       FROM business_card_views
       WHERE business_card_id = $1`,
      [cardId],
    );
    const row = rows[0];
    return {
      total: Number(row?.total ?? 0),
      today: Number(row?.today ?? 0),
      days7: Number(row?.days7 ?? 0),
      days30: Number(row?.days30 ?? 0),
      mobile: Number(row?.mobile ?? 0),
      tablet: Number(row?.tablet ?? 0),
      desktop: Number(row?.desktop ?? 0),
    };
  });
}

export async function recordBusinessCardView(
  cardId: string,
  input: { userAgent: string; country: string | null; referrer: string | null },
): Promise<void> {
  const deviceType = deviceTypeFromUserAgent(input.userAgent);
  const country = safeCountryCode(input.country);
  const referrer = safeReferrer(input.referrer);
  await withDb(async (query) => {
    await query(
      `INSERT INTO business_card_views (business_card_id, device_type, country, referrer)
       VALUES ($1, $2, $3, $4)`,
      [cardId, deviceType, country, referrer],
    );
  });
}
