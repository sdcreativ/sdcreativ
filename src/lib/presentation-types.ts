export type PresentationTrack = "salon" | "bureau";

export type PresentationLocation =
  | "salon"
  | "bureau_client"
  | "bureau_sdcreativ"
  | "visio"
  | "autre";

export type PresentationSlide = {
  id: string;
  image: string;
  title: string;
  oralHint?: string;
};

export type PresentationContext = {
  track: PresentationTrack;
  location: PresentationLocation;
  locationNote?: string;
  clientSector?: string;
  presenterNotes?: string;
  presenterId: string;
  presenterName: string;
  presenterEmail: string;
  slidesCompleted: string[];
  startedAt: string;
  validatedAt: string;
  clientValidatedOrally: boolean;
};

export type PresentationSessionSetup = {
  track: PresentationTrack;
  location: PresentationLocation;
  locationNote?: string;
  clientSector?: string;
  startedAt: string;
};
