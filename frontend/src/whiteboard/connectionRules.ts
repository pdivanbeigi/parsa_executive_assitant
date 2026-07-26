import type { Edge, Node } from "@xyflow/react";
import { findCatalogItem } from "./awsCatalog";
import type { ResourceNodeData } from "./nodeTypes";

/**
 * Pairs of catalog item ids that should never be connected directly, with a
 * human-readable reason shown to the user when blocked. Order-independent.
 */
const DISALLOWED_PAIRS: Array<[string, string, string]> = [
  ["client", "rds", "Client traffic should not hit a database directly \u2014 route it through an API/compute layer."],
  ["client", "aurora", "Client traffic should not hit a database directly \u2014 route it through an API/compute layer."],
  ["client", "dynamodb", "Client traffic should not hit a database directly \u2014 route it through an API/compute layer."],
  ["client", "documentdb", "Client traffic should not hit a database directly \u2014 route it through an API/compute layer."],
  ["client", "redshift", "Client traffic should not hit a data warehouse directly \u2014 route it through an API/analytics layer."],
  ["internet", "rds", "The public internet should never connect directly to a database \u2014 keep databases in private subnets."],
  ["internet", "aurora", "The public internet should never connect directly to a database \u2014 keep databases in private subnets."],
  ["internet", "dynamodb", "The public internet should never connect directly to a database \u2014 keep databases in private subnets."],
  ["internet", "ebs", "EBS volumes attach to compute instances, not to the internet."],
  ["cloudfront", "rds", "CloudFront caches content \u2014 it should point at S3/ALB/API Gateway, not a database directly."],
  ["cloudfront", "dynamodb", "CloudFront caches content \u2014 it should point at S3/ALB/API Gateway, not a database directly."],
];

function normalizedPairMatch(a: string, b: string, rule: [string, string, string]): boolean {
  const [ruleA, ruleB] = rule;
  return (a === ruleA && b === ruleB) || (a === ruleB && b === ruleA);
}

export interface ConnectionCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkConnection(
  sourceNode: Node | undefined,
  targetNode: Node | undefined,
  existingEdges: Edge[],
): ConnectionCheckResult {
  if (!sourceNode || !targetNode) {
    return { allowed: false, reason: "Could not resolve the connection endpoints." };
  }

  if (sourceNode.id === targetNode.id) {
    return { allowed: false, reason: "A resource cannot connect to itself." };
  }

  if (sourceNode.type === "boundary" || targetNode.type === "boundary") {
    return {
      allowed: false,
      reason:
        "Boundaries (Tenant / VPC / Availability Zone / Subnet) represent containment, not connections \u2014 drag resources inside the box instead of drawing an edge.",
    };
  }

  if (sourceNode.type === "comment" || targetNode.type === "comment") {
    return { allowed: false, reason: "Comments cannot be connected to other nodes." };
  }

  const sourceData = sourceNode.data as ResourceNodeData;
  const targetData = targetNode.data as ResourceNodeData;
  const sourceCatalog = findCatalogItem(sourceData.catalogId);
  const targetCatalog = findCatalogItem(targetData.catalogId);

  if (sourceCatalog?.id === "iam" || targetCatalog?.id === "iam") {
    return {
      allowed: false,
      reason: "IAM roles represent permissions, not network connections \u2014 attach them by grouping instead.",
    };
  }

  const duplicate = existingEdges.some(
    (edge) =>
      (edge.source === sourceNode.id && edge.target === targetNode.id) ||
      (edge.source === targetNode.id && edge.target === sourceNode.id),
  );
  if (duplicate) {
    return { allowed: false, reason: "These two resources are already connected." };
  }

  if (sourceCatalog && targetCatalog) {
    const violated = DISALLOWED_PAIRS.find((rule) => normalizedPairMatch(sourceCatalog.id, targetCatalog.id, rule));
    if (violated) {
      return { allowed: false, reason: violated[2] };
    }
  }

  return { allowed: true };
}
