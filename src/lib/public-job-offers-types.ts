export type PublicJobOfferRecord = {
  id: string;
  slug: string;
  title: string;
  type: string;
  location: string;
  department: string;
  description: string;
  missions: string[];
  profile: string[];
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};
