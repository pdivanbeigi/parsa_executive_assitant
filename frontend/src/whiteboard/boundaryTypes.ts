export type BoundaryType = "tenant" | "vpc" | "az" | "subnet";

export interface BoundaryDef {
  type: BoundaryType;
  label: string;
  defaultColor: string;
  defaultWidth: number;
  defaultHeight: number;
  description: string;
}

export const BOUNDARY_DEFS: Record<BoundaryType, BoundaryDef> = {
  tenant: {
    type: "tenant",
    label: "Tenant / Account",
    defaultColor: "#0F62FE",
    defaultWidth: 900,
    defaultHeight: 600,
    description: "An AWS account or customer tenant boundary. Can contain VPCs and any resource.",
  },
  vpc: {
    type: "vpc",
    label: "VPC",
    defaultColor: "#8C4FFF",
    defaultWidth: 700,
    defaultHeight: 460,
    description: "A Virtual Private Cloud network boundary.",
  },
  az: {
    type: "az",
    label: "Availability Zone",
    defaultColor: "#545B64",
    defaultWidth: 420,
    defaultHeight: 340,
    description: "An Availability Zone within a VPC.",
  },
  subnet: {
    type: "subnet",
    label: "Subnet",
    defaultColor: "#00A4A6",
    defaultWidth: 320,
    defaultHeight: 220,
    description: "A public or private subnet.",
  },
};

/** Tenant boxes get an auto-assigned distinguishing color from this palette. */
export const TENANT_COLOR_PALETTE = [
  "#0F62FE",
  "#D9822B",
  "#8C4FFF",
  "#DA1E5A",
  "#00A4A6",
  "#7AA116",
  "#B5179E",
  "#5A6472",
];
