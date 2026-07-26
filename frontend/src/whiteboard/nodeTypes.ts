import type { BoundaryType } from "./boundaryTypes";

export interface ResourceNodeData extends Record<string, unknown> {
  catalogId: string;
  label: string;
}

export interface BoundaryNodeData extends Record<string, unknown> {
  boundaryType: BoundaryType;
  label: string;
  color: string;
}

export interface CommentThreadEntry {
  text: string;
  createdAt: string;
}

export interface CommentNodeData extends Record<string, unknown> {
  comments: CommentThreadEntry[];
}
