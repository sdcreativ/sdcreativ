import Image from "next/image";
import { AnimatedCard } from "@/components/ui/AnimatedSection";
import type { TeamMember } from "@/content/team";
import { DEFAULT_IMAGE_POSITION } from "@/lib/image-position";
import { resolveImageDisplayUrl, isProxiedMediaUrl } from "@/lib/image-url";
import { splitTeamByOrgTier } from "@/lib/team-org";
import { cn } from "@/lib/utils";

type Props = {
  members: TeamMember[];
  /** Affiche les missions sous le rôle (page À propos). */
  showMissions?: boolean;
  /** Taille portrait : compact (aperçu home) ou large (page équipe). */
  size?: "compact" | "large";
  labels?: {
    leadership: string;
    operations: string;
  };
};

function MemberNode({
  member,
  delay,
  showMissions,
  size,
}: {
  member: TeamMember;
  delay: number;
  showMissions: boolean;
  size: "compact" | "large";
}) {
  const imageSrc = resolveImageDisplayUrl(member.image);
  const avatarClass =
    size === "large"
      ? "mb-5 h-28 w-28 md:h-32 md:w-32"
      : "mb-4 h-20 w-20";

  return (
    <AnimatedCard
      delay={delay}
      className={cn(
        "group relative z-10 flex h-full w-full max-w-66 flex-col items-center rounded-2xl border border-gray/60 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md",
        showMissions && "hover:shadow-lg",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full bg-gray-light ring-4 ring-primary-light",
          avatarClass,
          size === "large" && "shadow-md transition-transform duration-300 group-hover:scale-105",
        )}
      >
        <Image
          src={imageSrc}
          alt={member.imageAlt}
          fill
          sizes={size === "large" ? "128px" : "80px"}
          unoptimized={isProxiedMediaUrl(imageSrc)}
          className="object-cover"
          style={{ objectPosition: member.imagePosition ?? DEFAULT_IMAGE_POSITION }}
        />
      </div>
      <h3
        className={cn(
          "font-bold leading-snug text-foreground",
          size === "large" ? "text-lg" : "text-base",
        )}
      >
        {member.name}
      </h3>
      <p
        className={cn(
          "mt-1 font-semibold text-primary",
          size === "large" ? "mt-2 text-sm" : "text-xs",
        )}
      >
        {member.role}
      </p>
      {showMissions ? (
        <p className="mt-4 flex-1 text-sm leading-relaxed text-gray-text">{member.missions}</p>
      ) : null}
    </AnimatedCard>
  );
}

export function TeamOrgChart({
  members,
  showMissions = false,
  size = "compact",
  labels = {
    leadership: "Direction & cofondateurs",
    operations: "Équipe opérationnelle",
  },
}: Props) {
  const { leadership, operations } = splitTeamByOrgTier(members);
  const hasHierarchy = operations.length > 0;

  return (
    <div
      className="mx-auto flex max-w-6xl flex-col items-center"
      role="list"
      aria-label="Organigramme de l'équipe SD CREATIV"
    >
      <div className="w-full">
        {hasHierarchy ? (
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-text">
            {labels.leadership}
          </p>
        ) : null}
        <div
          className={cn(
            "grid justify-items-center gap-6",
            leadership.length >= 4
              ? "sm:grid-cols-2 xl:grid-cols-4"
              : leadership.length === 3
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : leadership.length === 2
                  ? "sm:grid-cols-2"
                  : "grid-cols-1",
          )}
        >
          {leadership.map((member, i) => (
            <div key={member.id} role="listitem" className="flex w-full justify-center">
              <MemberNode
                member={member}
                delay={i * 0.06}
                showMissions={showMissions}
                size={size}
              />
            </div>
          ))}
        </div>
      </div>

      {hasHierarchy ? (
        <>
          <div className="flex flex-col items-center py-2" aria-hidden>
            <div className="h-8 w-px bg-linear-to-b from-primary/40 to-primary/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(37,99,235,0.12)]" />
            <div className="h-8 w-px bg-linear-to-b from-primary/70 to-primary/30" />
          </div>

          <div className="w-full">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-text">
              {labels.operations}
            </p>
            <div
              className={cn(
                "mx-auto grid justify-items-center gap-6",
                operations.length === 1
                  ? "max-w-sm grid-cols-1"
                  : operations.length === 2
                    ? "max-w-2xl sm:grid-cols-2"
                    : "sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {operations.map((member, i) => (
                <div key={member.id} role="listitem" className="flex w-full justify-center">
                  <MemberNode
                    member={member}
                    delay={(leadership.length + i) * 0.06}
                    showMissions={showMissions}
                    size={size}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
