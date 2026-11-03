export const METRIC_ORDER = ["views", "reach", "total_interactions", "follows", "profile_views", "website_clicks"] as const;
export type InstagramMetric = (typeof METRIC_ORDER)[number];

export const METRICS: Record<InstagramMetric, { label: string; dailyLabel: string; description: string }> = {
  views: { label: "Vues", dailyLabel: "Vues quotidiennes", description: "Le nombre de fois où votre contenu Instagram a été affiché ou lu. Une même personne peut générer plusieurs vues." },
  reach: { label: "Couverture", dailyLabel: "Couverture quotidienne", description: "Le nombre estimé de comptes uniques qui ont vu votre contenu Instagram au moins une fois." },
  total_interactions: { label: "Nombre d’interactions", dailyLabel: "Interactions quotidiennes", description: "Le nombre total d’actions effectuées sur votre contenu, notamment les mentions J’aime, commentaires, enregistrements et partages." },
  follows: { label: "Followers en plus", dailyLabel: "Nouveaux followers quotidiens", description: "Le nombre de comptes qui ont commencé à suivre votre compte Instagram pendant la période. Les désabonnements ne sont pas déduits." },
  profile_views: { label: "Visites", dailyLabel: "Visites quotidiennes", description: "Le nombre de fois où votre profil Instagram a été consulté pendant la période sélectionnée." },
  website_clicks: { label: "Clics sur un lien", dailyLabel: "Clics quotidiens", description: "Le nombre de fois où des personnes ont appuyé sur le lien de site web présent sur votre profil Instagram." },
};

export type DailyView = {
  date: string;
  value: number | null;
};

export type MetricData = {
  metric: InstagramMetric;
  total: number | null;
  previousTotal: number | null;
  evolution: number | null;
  daily: DailyView[];
  consistency: {
    status: "consistent" | "mismatch" | "unavailable";
    dailySum: number | null;
  };
};

export type ReportData = {
  account: { id: string; username: string; followersCount: number | null };
  period: { start: string; end: string };
  previousPeriod: { start: string; end: string };
  metrics: Record<InstagramMetric, MetricData>;
  history: Record<InstagramMetric, MonthlyMetric[]>;
  topContent: TopContent[];
};

export type MonthlyMetric = {
  month: string;
  value: number | null;
  status: "meta" | "estimated" | "partial";
  coveredDays: number;
  totalDays: number;
};

export type TopContent = {
  id: string;
  caption: string | null;
  type: "Publication" | "Carrousel" | "Reel";
  publishedAt: string;
  imageUrl: string | null;
  permalink: string;
  views: number | null;
  reach: number | null;
  interactions: number | null;
};
