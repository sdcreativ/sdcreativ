import type { EmployeeContractType } from "@/content/employee-contracts-labels";

export type EmployeeContractClause = {
  key: string;
  title: string;
  body: string;
};

/**
 * Placeholders interpolés à la génération du PDF :
 * {{employerName}} {{employerAddress}} {{employerEmail}} {{employerPhone}}
 * {{employerRccm}} {{employerNcc}} {{employeeName}} {{employeeEmail}}
 * {{jobTitle}} {{department}} {{workLocation}} {{weeklyHours}}
 * {{startDate}} {{endDate}} {{trialEndDate}} {{compensation}}
 * {{contractType}} {{reference}} {{internalReference}} {{missions}}
 * {{benefits}} {{departmentName}}
 */

const COMMON_CLAUSES: EmployeeContractClause[] = [
  {
    key: "parties",
    title: "Article 1 — Parties au contrat",
    body: `Le présent contrat est conclu entre :

D'une part, {{employerName}}, société immatriculée au RCCM sous le numéro {{employerRccm}}, NCC {{employerNcc}}, dont le siège est situé à {{employerAddress}}, représentée aux fins des présentes (ci-après « l'Employeur ») ;

Et d'autre part, {{employeeName}}, joignable à l'adresse électronique {{employeeEmail}} (ci-après « le Collaborateur »).

Les parties déclarent avoir la capacité juridique pour s'engager et reconnaissent que le présent contrat constitue l'intégralité de leur accord sur son objet.`,
  },
  {
    key: "object",
    title: "Article 2 — Objet",
    body: `Le présent contrat a pour objet de définir les conditions dans lesquelles le Collaborateur est engagé par l'Employeur en qualité de {{jobTitle}}{{department}}, sous le régime {{contractType}}, référence {{reference}}{{internalReference}}.

Les missions principales sont les suivantes :

{{missions}}

Le Collaborateur pourra se voir confier toute mission connexe ou complémentaire compatible avec sa qualification et les besoins de l'Employeur.`,
  },
  {
    key: "place_hours",
    title: "Article 3 — Lieu de travail et durée du travail",
    body: `Le lieu principal d'exécution est : {{workLocation}}.
L'Employeur se réserve la possibilité de modifier ce lieu dans la limite d'un rayon raisonnable ou d'organiser du télétravail partiel, sans que cela constitue une modification substantielle du contrat, sous réserve d'en informer le Collaborateur dans un délai raisonnable.

La durée du travail est fixée à {{weeklyHours}} heures par semaine, réparties selon le planning communiqué par l'Employeur, dans le respect de la législation du travail en vigueur en République de Côte d'Ivoire.

Les heures supplémentaires éventuelles sont accomplies à la demande de l'Employeur et rémunérées ou compensées conformément au Code du travail ivoirien et aux usages de l'entreprise.`,
  },
  {
    key: "remuneration",
    title: "Article 4 — Rémunération",
    body: `En contrepartie de ses fonctions, le Collaborateur perçoit une rémunération de {{compensation}}, payable selon les modalités et échéances en vigueur au sein de l'Employeur (généralement mensuellement, à terme échu).

Cette rémunération est soumise aux cotisations et retenues légales applicables. Tout élément variable (prime, commission, bonus) n'a de caractère contractuel que s'il est expressément prévu par avenant ou politique écrite de l'Employeur.`,
  },
  {
    key: "benefits",
    title: "Article 5 — Avantages et accessoires",
    body: `Outre la rémunération principale, le Collaborateur peut bénéficier des avantages suivants, dans les conditions fixées par l'Employeur et sous réserve des dispositions légales :

{{benefits}}

Ces avantages ne constituent pas un droit acquis définitif lorsqu'ils résultent d'une politique unilatérale ; l'Employeur pourra les adapter sous réserve du respect des droits acquis et des procédures applicables.`,
  },
  {
    key: "obligations",
    title: "Article 6 — Obligations du Collaborateur",
    body: `Le Collaborateur s'engage notamment à :
1. Exécuter ses missions avec diligence, loyauté et professionnalisme ;
2. Respecter le règlement intérieur, les procédures de sécurité, de qualité et de confidentialité ;
3. Informer sans délai l'Employeur de tout conflit d'intérêts ou empêchement ;
4. Utiliser les outils et données de l'entreprise à des fins exclusivement professionnelles, sauf autorisation écrite ;
5. Se conformer aux instructions hiérarchiques légitimes et aux objectifs fixés.`,
  },
  {
    key: "employer_obligations",
    title: "Article 7 — Obligations de l'Employeur",
    body: `L'Employeur s'engage notamment à :
1. Fournir au Collaborateur les moyens nécessaires à l'exécution de ses missions ;
2. Verser la rémunération convenue aux échéances prévues ;
3. Respecter les dispositions du Code du travail ivoirien relatives à la santé, à la sécurité et à la dignité au travail ;
4. Assurer, dans la mesure du possible, l'information et la formation utiles à l'exercice des fonctions.`,
  },
  {
    key: "confidentiality",
    title: "Article 8 — Confidentialité et données",
    body: `Le Collaborateur s'interdit de divulguer, pendant la durée du contrat et après sa cessation, toute information confidentielle relative à l'Employeur, ses clients, prospects, partenaires, méthodes, codes sources, tarifs, stratégies ou données personnelles dont il aurait connaissance à l'occasion de ses fonctions.

Cette obligation survit à la fin du contrat pour une durée de cinq (5) ans, sans préjudice des secrets d'affaires protégés plus longtemps par la loi.

Le Collaborateur s'engage à restituer, à la demande ou à la fin du contrat, tous supports, accès et documents appartenant à l'Employeur.`,
  },
  {
    key: "ip",
    title: "Article 9 — Propriété intellectuelle",
    body: `Sauf disposition légale contraire et d'ordre public, les créations, développements, documents, designs, logiciels, bases de données et contenus réalisés par le Collaborateur dans le cadre de ses fonctions et pour le compte de l'Employeur sont la propriété exclusive de l'Employeur dès leur réalisation.

Le Collaborateur cède à l'Employeur, à titre exclusif et pour le monde entier, pour la durée de protection légale, les droits d'exploitation nécessaires (reproduction, représentation, adaptation, distribution, sous-licence), dans la limite autorisée par le droit applicable.

Le Collaborateur garantit ne pas incorporer de contenus tiers sans autorisation et signalera toute contrainte de licence open source.`,
  },
  {
    key: "leave",
    title: "Article 10 — Congés et absences",
    body: `Le Collaborateur bénéficie des congés payés et repos conformément au Code du travail ivoirien et aux usages de l'entreprise. Les dates de congés sont fixées d'un commun accord, en tenant compte des besoins du service.

Toute absence doit être justifiée et signalée dans les meilleurs délais selon la procédure interne. Les absences injustifiées peuvent entraîner des sanctions disciplinaires, dans le respect de la procédure légale.`,
  },
  {
    key: "discipline",
    title: "Article 11 — Discipline et sanctions",
    body: `En cas de manquement aux obligations du présent contrat ou au règlement intérieur, l'Employeur peut engager une procédure disciplinaire conforme au Code du travail ivoirien (avertissement, blâme, mise à pied, licenciement, etc.), en respectant les droits de la défense du Collaborateur.`,
  },
  {
    key: "termination",
    title: "Article 12 — Fin du contrat",
    body: `Le contrat peut prendre fin dans les cas prévus par la loi et le présent acte : arrivée du terme, démission, licenciement pour motif personnel ou économique, rupture d'un commun accord, force majeure, ou toute autre cause légale.

Sauf disposition légale particulière au type de contrat, les délais de préavis, indemnités et formalités sont ceux prévus par le Code du travail ivoirien et, le cas échéant, les conventions ou usages applicables.

À la cessation, le Collaborateur restitue les biens et accès de l'Employeur et reçoit les documents de fin de contrat requis.`,
  },
  {
    key: "law",
    title: "Article 13 — Droit applicable et litiges",
    body: `Le présent contrat est régi par le droit de la République de Côte d'Ivoire, notamment le Code du travail et les textes réglementaires applicables.

En cas de différend, les parties s'efforceront de trouver une solution amiable. À défaut, les tribunaux compétents d'Abidjan seront seuls compétents, sous réserve des règles d'ordre public.`,
  },
  {
    key: "final",
    title: "Article 14 — Dispositions finales",
    body: `Si une clause du présent contrat était déclarée nulle ou inapplicable, les autres dispositions demeureraient en vigueur.

Toute modification du contrat doit faire l'objet d'un avenant écrit signé des deux parties, sauf adaptation autorisée par la loi.

Le Collaborateur reconnaît avoir pris connaissance du présent contrat, en avoir reçu un exemplaire, et l'accepter sans réserve.

Fait à Abidjan, en deux (2) exemplaires originaux.`,
  },
];

function typeSpecificClauses(type: EmployeeContractType): EmployeeContractClause[] {
  switch (type) {
    case "cdi":
      return [
        {
          key: "duration",
          title: "Article 2 bis — Durée et période d'essai",
          body: `Le présent contrat est conclu pour une durée indéterminée à compter du {{startDate}}.

Une période d'essai est prévue jusqu'au {{trialEndDate}}. Durant cette période, chacune des parties peut rompre le contrat dans les conditions et délais prévus par le Code du travail ivoirien, sans indemnité sauf disposition légale contraire.

À l'issue de la période d'essai non dénoncée, l'engagement se poursuit en CDI.`,
        },
      ];
    case "cdd":
      return [
        {
          key: "duration",
          title: "Article 2 bis — Durée déterminée",
          body: `Le présent contrat est conclu pour une durée déterminée, du {{startDate}} au {{endDate}}, conformément aux motifs et conditions autorisés par le Code du travail ivoirien.

Il ne peut être renouvelé ou prolongé que dans les limites légales. Sauf transformation en CDI prévue par la loi, le contrat prend fin de plein droit à l'échéance du terme.

Une période d'essai peut courir jusqu'au {{trialEndDate}}, dans les conditions légales applicables au CDD.`,
        },
      ];
    case "stage":
      return [
        {
          key: "duration",
          title: "Article 2 bis — Convention de stage",
          body: `Le présent acte constitue une convention de stage à caractère formateur, du {{startDate}} au {{endDate}}.

Le stagiaire n'occupe pas un emploi permanent ; l'objet principal est l'acquisition d'une expérience professionnelle et la mise en pratique de connaissances. L'indemnité ou gratification éventuelle est indiquée à l'article relatif à la rémunération.

Le stage se déroule sous la supervision d'un tuteur désigné par l'Employeur. Une attestation de stage sera délivrée à l'issue, sous réserve de l'assiduité et du respect des engagements.`,
        },
        {
          key: "stage_status",
          title: "Article 6 bis — Statut du stagiaire",
          body: `Le stagiaire demeure, le cas échéant, rattaché à son établissement de formation. Il s'engage à respecter les horaires, consignes de sécurité et confidentialité. Le stage ne saurait se substituer à un emploi salarié au sens du Code du travail, sauf requalification judiciaire.`,
        },
      ];
    case "alternance":
    case "apprentissage":
      return [
        {
          key: "duration",
          title: "Article 2 bis — Alternance / apprentissage",
          body: `Le présent contrat s'inscrit dans un parcours de formation en alternance / apprentissage, du {{startDate}} au {{endDate}}.

Le temps de travail et de formation est organisé conformément à la convention avec l'organisme de formation et au Code du travail ivoirien. Le Collaborateur s'engage à suivre assidûment la formation et à transmettre les justificatifs demandés.

Une période d'essai peut s'appliquer jusqu'au {{trialEndDate}}, selon les règles propres à ce régime.`,
        },
      ];
    case "freelance":
    case "prestation":
      return [
        {
          key: "duration",
          title: "Article 2 bis — Prestation / indépendance",
          body: `Le présent contrat porte sur une prestation de services / mission freelance du {{startDate}} au {{endDate}} (ou jusqu'à achèvement des livrables définis).

Le prestataire agit en professionnel indépendant ; le présent acte ne crée pas, sauf requalification, un lien de subordination de type salariat. Le prestataire demeure responsable de ses obligations fiscales et sociales en tant qu'indépendant, sauf accord écrit contraire.

Les livrables, délais et critères d'acceptation sont précisés dans les missions ou un cahier des charges annexé.`,
        },
        {
          key: "independence",
          title: "Article 6 bis — Indépendance",
          body: `Le prestataire organise librement son activité, sous réserve du respect des délais et du niveau de qualité convenus. Il peut faire appel à des sous-traitants avec accord préalable écrit de l'Employeur (ou client) et reste garant de leurs actes.`,
        },
      ];
    default:
      return [];
  }
}

export const DEFAULT_BENEFITS_BY_TYPE: Record<EmployeeContractType, string[]> = {
  cdi: [
    "Couverture sociale / CNPS selon le régime applicable",
    "Congés payés conformément au Code du travail",
    "Matériel informatique professionnel mis à disposition le cas échéant",
    "Accès aux outils collaboratifs de l'entreprise",
    "Participation éventuelle aux formations internes",
  ],
  cdd: [
    "Couverture sociale / CNPS selon le régime applicable",
    "Congés payés au prorata selon la loi",
    "Matériel professionnel mis à disposition le cas échéant",
    "Accès aux outils de l'entreprise pour la durée du contrat",
  ],
  stage: [
    "Gratification / indemnité de stage si prévue au contrat",
    "Encadrement par un tuteur",
    "Attestation de stage en fin de période",
    "Accès aux locaux et outils nécessaires à la formation",
  ],
  alternance: [
    "Rémunération selon le barème / accord applicable",
    "Temps de formation pris en compte selon la convention",
    "Tutorat entreprise",
    "Couverture sociale selon le régime d'alternance",
  ],
  apprentissage: [
    "Rémunération selon le régime d'apprentissage applicable",
    "Formation théorique et pratique",
    "Maître d'apprentissage / tuteur",
    "Couverture sociale selon les textes en vigueur",
  ],
  freelance: [
    "Paiement selon les jalons / factures validées",
    "Accès temporaire aux outils nécessaires à la mission",
    "Pas de lien de subordination salariale (sauf requalification)",
  ],
  prestation: [
    "Paiement selon livrables acceptés",
    "Accès aux informations nécessaires à l'exécution",
    "Cadre de mission défini par cahier des charges",
  ],
};

export const DEFAULT_MISSIONS_BY_TYPE: Record<EmployeeContractType, string> = {
  cdi: `— Réaliser les missions attachées au poste de {{jobTitle}} ;
— Contribuer aux projets et objectifs de l'équipe {{departmentName}} ;
— Rendre compte régulièrement à la hiérarchie ;
— Participer à l'amélioration continue des process et de la qualité de service.`,
  cdd: `— Assurer les missions définies pour la durée du CDD sur le poste de {{jobTitle}} ;
— Remplacer / renforcer l'équipe selon le motif du recours au CDD ;
— Transmettre le nécessaire en fin de mission pour assurer la continuité.`,
  stage: `— Découvrir le fonctionnement de l'agence et du poste de {{jobTitle}} ;
— Participer à des tâches encadrées et formatives ;
— Produire un compte-rendu / livrable de fin de stage si demandé ;
— Respecter les consignes du tuteur et les règles de l'entreprise.`,
  alternance: `— Alterner périodes en entreprise et en centre de formation ;
— Mettre en pratique les enseignements sur le poste de {{jobTitle}} ;
— Atteindre les objectifs pédagogiques et professionnels fixés avec le tuteur.`,
  apprentissage: `— Suivre le parcours d'apprentissage convenu ;
— Acquérir les compétences du métier sous la responsabilité du maître d'apprentissage ;
— Respecter les obligations de formation et de présence.`,
  freelance: `— Fournir les livrables définis pour la mission {{jobTitle}} ;
— Respecter les délais et le niveau de qualité convenus ;
— Informer sans délai de tout risque de retard ou blocage.`,
  prestation: `— Exécuter la prestation décrite au cahier des charges ;
— Livrer les éléments attendus pour validation ;
— Assurer la reprise / documentation nécessaire à la clôture de mission.`,
};

/** Assemble les clauses dans un ordre juridique lisible. */
export function buildDefaultClauses(type: EmployeeContractType): EmployeeContractClause[] {
  const specific = typeSpecificClauses(type);
  const byKey = new Map<string, EmployeeContractClause>();

  for (const clause of COMMON_CLAUSES) {
    byKey.set(clause.key, clause);
  }
  // Insérer les clauses spécifiques après "object"
  const ordered: EmployeeContractClause[] = [];
  for (const clause of COMMON_CLAUSES) {
    ordered.push(clause);
    if (clause.key === "object") {
      for (const s of specific.filter((c) => c.key === "duration")) {
        ordered.push(s);
      }
    }
    if (clause.key === "obligations") {
      for (const s of specific.filter((c) => c.key !== "duration")) {
        ordered.push(s);
      }
    }
  }

  // Renumeroter les titres Article N
  return ordered.map((clause, index) => ({
    ...clause,
    title: clause.title.replace(/^Article\s+\d+(\s*bis)?/, `Article ${index + 1}`),
  }));
}

export function buildDefaultBenefits(type: EmployeeContractType): string[] {
  return [...DEFAULT_BENEFITS_BY_TYPE[type]];
}

export function buildDefaultMissions(type: EmployeeContractType): string {
  return DEFAULT_MISSIONS_BY_TYPE[type];
}
