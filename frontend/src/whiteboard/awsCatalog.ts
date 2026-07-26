import type { Category } from "./categories";

export interface CatalogItem {
  id: string;
  label: string;
  shortCode: string;
  category: Category;
  /** Search keywords beyond the label itself, e.g. "python" -> Lambda */
  tags: string[];
}

export const AWS_CATALOG: CatalogItem[] = [
  // Compute
  { id: "ec2", label: "EC2 Instance", shortCode: "EC2", category: "compute", tags: ["virtual machine", "vm", "server", "instance", "compute"] },
  { id: "lambda", label: "Lambda Function", shortCode: "\u03BB", category: "compute", tags: ["function", "serverless", "python", "node", "nodejs", "java", "go", "code", "faas"] },
  { id: "ecs", label: "ECS Service", shortCode: "ECS", category: "compute", tags: ["container", "docker", "task", "microservice"] },
  { id: "eks", label: "EKS Cluster", shortCode: "EKS", category: "compute", tags: ["kubernetes", "k8s", "container", "cluster", "orchestration"] },
  { id: "fargate", label: "Fargate Task", shortCode: "FG", category: "compute", tags: ["serverless container", "docker", "task"] },
  { id: "ecr", label: "ECR Repository", shortCode: "ECR", category: "compute", tags: ["container registry", "docker images", "images"] },
  { id: "elasticbeanstalk", label: "Elastic Beanstalk", shortCode: "EB", category: "compute", tags: ["paas", "deploy", "app hosting"] },
  { id: "lightsail", label: "Lightsail", shortCode: "LS", category: "compute", tags: ["vps", "simple hosting"] },
  { id: "batch", label: "AWS Batch", shortCode: "BAT", category: "compute", tags: ["batch jobs", "hpc"] },
  { id: "autoscaling", label: "Auto Scaling Group", shortCode: "ASG", category: "compute", tags: ["scale", "asg", "elasticity"] },

  // Storage
  { id: "s3", label: "S3 Bucket", shortCode: "S3", category: "storage", tags: ["object storage", "bucket", "files", "static website"] },
  { id: "ebs", label: "EBS Volume", shortCode: "EBS", category: "storage", tags: ["block storage", "disk", "volume"] },
  { id: "efs", label: "EFS File System", shortCode: "EFS", category: "storage", tags: ["nfs", "shared storage", "file system"] },
  { id: "glacier", label: "S3 Glacier", shortCode: "GLA", category: "storage", tags: ["archive", "cold storage", "backup"] },
  { id: "fsx", label: "FSx", shortCode: "FSX", category: "storage", tags: ["windows file server", "lustre"] },
  { id: "backup", label: "AWS Backup", shortCode: "BAK", category: "storage", tags: ["disaster recovery", "snapshot"] },

  // Database
  { id: "rds", label: "RDS Database", shortCode: "RDS", category: "database", tags: ["sql", "mysql", "postgres", "postgresql", "relational database", "oracle"] },
  { id: "aurora", label: "Aurora", shortCode: "AUR", category: "database", tags: ["mysql", "postgres", "relational", "serverless sql"] },
  { id: "dynamodb", label: "DynamoDB", shortCode: "DDB", category: "database", tags: ["nosql", "key value", "document"] },
  { id: "elasticache", label: "ElastiCache", shortCode: "EC", category: "database", tags: ["redis", "memcached", "cache", "in-memory"] },
  { id: "redshift", label: "Redshift", shortCode: "RS", category: "database", tags: ["data warehouse", "olap", "sql analytics"] },
  { id: "documentdb", label: "DocumentDB", shortCode: "DOC", category: "database", tags: ["mongodb", "nosql", "document database"] },
  { id: "neptune", label: "Neptune", shortCode: "NEP", category: "database", tags: ["graph database", "graph"] },
  { id: "timestream", label: "Timestream", shortCode: "TS", category: "database", tags: ["time series", "iot data", "metrics"] },

  // Networking
  { id: "alb", label: "Application Load Balancer", shortCode: "ALB", category: "networking", tags: ["load balancer", "elb", "http", "layer 7"] },
  { id: "nlb", label: "Network Load Balancer", shortCode: "NLB", category: "networking", tags: ["load balancer", "tcp", "layer 4"] },
  { id: "cloudfront", label: "CloudFront", shortCode: "CF", category: "networking", tags: ["cdn", "content delivery", "edge cache"] },
  { id: "route53", label: "Route 53", shortCode: "R53", category: "networking", tags: ["dns", "domain", "hosted zone"] },
  { id: "apigateway", label: "API Gateway", shortCode: "API", category: "networking", tags: ["rest api", "http api", "websocket", "endpoint"] },
  { id: "internetgateway", label: "Internet Gateway", shortCode: "IGW", category: "networking", tags: ["igw", "public access"] },
  { id: "natgateway", label: "NAT Gateway", shortCode: "NAT", category: "networking", tags: ["outbound internet", "nat"] },
  { id: "vpn", label: "Site-to-Site VPN", shortCode: "VPN", category: "networking", tags: ["tunnel", "hybrid connectivity"] },
  { id: "directconnect", label: "Direct Connect", shortCode: "DX", category: "networking", tags: ["dedicated network", "hybrid link"] },
  { id: "transitgateway", label: "Transit Gateway", shortCode: "TGW", category: "networking", tags: ["network hub", "vpc peering"] },
  { id: "globalaccelerator", label: "Global Accelerator", shortCode: "GA", category: "networking", tags: ["anycast", "latency routing"] },

  // Security
  { id: "iam", label: "IAM Role", shortCode: "IAM", category: "security", tags: ["identity", "role", "permissions", "policy"] },
  { id: "kms", label: "KMS", shortCode: "KMS", category: "security", tags: ["encryption", "keys", "key management"] },
  { id: "cognito", label: "Cognito", shortCode: "COG", category: "security", tags: ["authentication", "login", "user pool", "identity pool", "auth"] },
  { id: "waf", label: "WAF", shortCode: "WAF", category: "security", tags: ["firewall", "web application firewall"] },
  { id: "shield", label: "Shield", shortCode: "SHD", category: "security", tags: ["ddos protection"] },
  { id: "secretsmanager", label: "Secrets Manager", shortCode: "SEC", category: "security", tags: ["credentials", "secrets", "passwords"] },
  { id: "guardduty", label: "GuardDuty", shortCode: "GD", category: "security", tags: ["threat detection", "intrusion detection"] },
  { id: "securitygroup", label: "Security Group", shortCode: "SG", category: "security", tags: ["firewall rules", "network acl"] },

  // Integration
  { id: "sqs", label: "SQS Queue", shortCode: "SQS", category: "integration", tags: ["queue", "messaging", "decoupling"] },
  { id: "sns", label: "SNS Topic", shortCode: "SNS", category: "integration", tags: ["notifications", "pub sub", "topic", "fanout"] },
  { id: "eventbridge", label: "EventBridge", shortCode: "EVB", category: "integration", tags: ["events", "event bus", "event-driven"] },
  { id: "stepfunctions", label: "Step Functions", shortCode: "SFN", category: "integration", tags: ["workflow", "orchestration", "state machine"] },
  { id: "appsync", label: "AppSync", shortCode: "GQL", category: "integration", tags: ["graphql", "realtime api"] },
  { id: "mq", label: "Amazon MQ", shortCode: "MQ", category: "integration", tags: ["rabbitmq", "activemq", "messaging broker"] },

  // Analytics
  { id: "kinesis", label: "Kinesis Stream", shortCode: "KIN", category: "analytics", tags: ["streaming", "real time data", "data stream"] },
  { id: "athena", label: "Athena", shortCode: "ATH", category: "analytics", tags: ["query", "sql on s3", "serverless query"] },
  { id: "glue", label: "Glue", shortCode: "GLU", category: "analytics", tags: ["etl", "data catalog", "data pipeline"] },
  { id: "emr", label: "EMR", shortCode: "EMR", category: "analytics", tags: ["hadoop", "spark", "big data"] },
  { id: "quicksight", label: "QuickSight", shortCode: "QS", category: "analytics", tags: ["dashboards", "bi", "business intelligence"] },
  { id: "opensearch", label: "OpenSearch", shortCode: "OS", category: "analytics", tags: ["elasticsearch", "search", "log analytics"] },

  // Machine Learning
  { id: "sagemaker", label: "SageMaker", shortCode: "SM", category: "ml", tags: ["machine learning", "ml", "model training", "python", "jupyter"] },
  { id: "rekognition", label: "Rekognition", shortCode: "REK", category: "ml", tags: ["image recognition", "computer vision", "video analysis"] },
  { id: "comprehend", label: "Comprehend", shortCode: "COM", category: "ml", tags: ["nlp", "text analysis", "sentiment"] },
  { id: "bedrock", label: "Bedrock", shortCode: "BR", category: "ml", tags: ["generative ai", "llm", "foundation models", "genai"] },

  // Management
  { id: "cloudwatch", label: "CloudWatch", shortCode: "CW", category: "management", tags: ["monitoring", "logs", "metrics", "alarms", "observability"] },
  { id: "cloudtrail", label: "CloudTrail", shortCode: "CT", category: "management", tags: ["audit", "activity logging"] },
  { id: "cloudformation", label: "CloudFormation", shortCode: "CFN", category: "management", tags: ["iac", "infrastructure as code", "stacks"] },
  { id: "systemsmanager", label: "Systems Manager", shortCode: "SSM", category: "management", tags: ["ssm", "patch management", "parameter store"] },
  { id: "config", label: "AWS Config", shortCode: "CFG", category: "management", tags: ["compliance", "resource tracking"] },
  { id: "organizations", label: "Organizations", shortCode: "ORG", category: "management", tags: ["multi account", "org", "consolidated billing"] },

  // External / pseudo-nodes
  { id: "client", label: "Client / End User", shortCode: "USR", category: "external", tags: ["user", "browser", "end user", "mobile app"] },
  { id: "internet", label: "Internet", shortCode: "NET", category: "external", tags: ["public network", "www"] },
  { id: "onprem", label: "On-Premises", shortCode: "ON", category: "external", tags: ["on-prem", "datacenter", "hybrid"] },
];

export function findCatalogItem(id: string): CatalogItem | undefined {
  return AWS_CATALOG.find((item) => item.id === id);
}

export function searchCatalog(query: string): CatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return AWS_CATALOG;
  return AWS_CATALOG.filter((item) => {
    if (item.label.toLowerCase().includes(q)) return true;
    if (item.shortCode.toLowerCase().includes(q)) return true;
    if (item.category.toLowerCase().includes(q)) return true;
    return item.tags.some((tag) => tag.includes(q) || q.includes(tag));
  });
}
