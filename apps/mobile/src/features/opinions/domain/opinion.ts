export type OpinionContent = Readonly<{
  rating: number | null;
  comment: string;
}>;

export type PublicOpinion = Readonly<{
  authorName: string;
  rating: number | null;
  comment: string | null;
  publishedAt: string;
}>;

export type PublicOpinionPage = Readonly<{
  items: readonly PublicOpinion[];
  total: number;
  limit: number;
  offset: number;
  summary: Readonly<{
    total: number;
    totalRatings: number;
    averageRating: number | null;
    distribution: Readonly<Record<"1" | "2" | "3" | "4" | "5", number>>;
  }>;
}>;

export type OpinionVersion = Readonly<{
  rating: number | null;
  comment: string | null;
  version: number;
  submittedAt: string;
  reviewedAt?: string | null;
}>;

export type OwnOpinionState = Readonly<{
  status: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  current: OpinionVersion | null;
  pending: OpinionVersion | null;
  lastRejected: (OpinionVersion & { reason: string | null }) | null;
  canCreate: boolean;
  canEdit: boolean;
}>;
