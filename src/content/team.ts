export type TeamMember = {
  id: string;
  name: string;
  role: string;
  missions: string;
  initials: string;
  image: string;
  imageAlt: string;
};

export const teamMembers: TeamMember[] = [
  {
    id: "simeon-auguste-ba",
    name: "Simeon Auguste BA",
    role: "Cofondateur & direction stratégique",
    missions:
      "Fixer le cap, valider les offres, superviser l'image de marque et les décisions majeures.",
    initials: "SB",
    image: "/images/team/simeon-auguste-ba.png",
    imageAlt: "Portrait de Simeon Auguste BA, cofondateur SD CREATIV",
  },
  {
    id: "gnonzion-guelapble-paterne",
    name: "GNONZION Guélablé Paterne",
    role: "Cofondateur & directeur technique / ingénieur",
    missions:
      "Piloter l'architecture technique, sécuriser les choix WordPress/Divi, encadrer l'intégration, la performance, les tests et la maintenance.",
    initials: "GP",
    image: "/images/team/gnonzion-guelapble-paterne.png",
    imageAlt: "Portrait de GNONZION Guélablé Paterne, directeur technique SD CREATIV",
  },
  {
    id: "kossa-disseka-ange-valeri",
    name: "Mlle Kossa Disseka Ange Valeri",
    role: "Cofondatrice & coordinatrice Côte d'Ivoire",
    missions:
      "Organiser le terrain, suivre les prospects, coordonner les commerciaux et garantir l'ancrage local.",
    initials: "AV",
    image: "/images/team/kossa-disseka-ange-valeri.png",
    imageAlt: "Portrait de Mlle Kossa Disseka Ange Valeri, coordinatrice SD CREATIV",
  },
  {
    id: "kady-coulibaly",
    name: "Kady Coulibaly",
    role: "Cofondatrice & appui opérationnel",
    missions:
      "Appuyer la coordination terrain, renforcer la relation client, collecter les informations, préparer les dossiers et suivre les relances.",
    initials: "KC",
    image: "/images/team/kady-coulibaly.png",
    imageAlt: "Portrait de Kady Coulibaly, cofondatrice SD CREATIV",
  },
];
