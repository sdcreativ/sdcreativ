import type { LucideIcon } from "lucide-react";
import type { ServiceDetail } from "@/content/service-details";

export type StoredServiceDetail = Omit<ServiceDetail, "id">;

export type PublicServiceRecord = {
  id: string;
  slug: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  image?: string;
  imageAlt?: string;
  detailHref?: string;
  detailLabel?: string;
  detail?: StoredServiceDetail | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedService = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  image?: string;
  imageAlt?: string;
  detailHref?: string;
  detailLabel?: string;
};

export type ResolvedServiceDetail = ServiceDetail;
