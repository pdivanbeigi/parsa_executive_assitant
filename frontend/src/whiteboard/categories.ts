export type Category =
  | "compute"
  | "storage"
  | "database"
  | "networking"
  | "security"
  | "integration"
  | "analytics"
  | "ml"
  | "management"
  | "external";

export const CATEGORY_COLORS: Record<Category, string> = {
  compute: "#ED7100",
  storage: "#7AA116",
  database: "#2E5FF2",
  networking: "#8C4FFF",
  security: "#DD344C",
  integration: "#E7157B",
  analytics: "#00A4A6",
  ml: "#6A3EE8",
  management: "#5A6472",
  external: "#232F3E",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  compute: "Compute",
  storage: "Storage",
  database: "Database",
  networking: "Networking",
  security: "Security",
  integration: "Integration",
  analytics: "Analytics",
  ml: "Machine Learning",
  management: "Management",
  external: "External",
};
