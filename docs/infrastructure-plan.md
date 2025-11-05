# Infrastructure Planning Overview

## Target Traffic, Tenancy, and Compliance Requirements
- **Traffic Profile**
  - Initial launch expectation of ~5,000 daily active users with peak concurrent sessions around 500.
  - Marketing campaigns and seasonal outdoor events can trigger 5× surges; infrastructure must gracefully scale to ~2,500 concurrent users and 25,000 daily actives.
  - API request rate baseline: 50 RPS during business hours, scaling to 250 RPS during peaks; design capacity for 400 RPS to provide 60% headroom.
  - Static asset delivery (maps, imagery) expected to serve ~250 GB/month with burst downloads up to 50 Mbps.
- **Tenancy Model**
  - Single-tenant application tier per environment (dev/staging/prod) with logically separated VPCs.
  - Multi-tenant data layer where customer data is namespaced via organization IDs; sensitive data scoped by row-level access controls.
  - Optionally support dedicated environments for enterprise customers by reusing Terraform workspaces and parameterized modules.
- **Compliance & Regulatory Considerations**
  - Adhere to GDPR requirements for EU users: data residency in eu-west-1 when required, support for data deletion/export workflows, logging of consent.
  - SOC 2 Type II alignment: enforce least-privilege IAM, logging/auditing, change management via CI/CD, quarterly access reviews.
  - Follow PCI DSS SAQ-A for payment integrations: isolate payment processor interactions, never store cardholder data; secure transport (TLS 1.2+) and WAF at the edge.
  - Maintain HIPAA-ready posture if health-related trip data is captured: encryption at rest, audit logs, and BAA with cloud provider.

## Platform and Managed Services Selection
- **Cloud Provider**: **AWS**
  - Mature global footprint, strong managed service portfolio, edge coverage, and compliance programs (SOC2, ISO 27001, HIPAA, GDPR).
  - Ecosystem support for geospatial workloads, serverless components, and strong partner network.
- **Compute & Orchestration**
  - Application tier on Amazon Elastic Kubernetes Service (EKS) for containerized web + API services, leveraging managed node groups with Spot integration for cost optimization.
  - AWS Fargate-backed workloads for bursty background jobs and cron schedules where appropriate.
- **Managed Database**: **Amazon RDS for PostgreSQL**
  - Provides automated backups, Multi-AZ deployments, read replicas, and compliance certifications.
  - Feature-rich ecosystem (PostGIS for location data) and easy integration with AWS services.
- **Caching Layer**: **Amazon ElastiCache for Redis**
  - Multi-AZ cluster mode for high availability, Redis 7 with auto-failover, and support for pub/sub features for real-time notifications.
- **Object Storage**: **Amazon S3**
  - Versioned buckets for uploads, static assets, and log archives; integrates with CloudFront for CDN distribution and AWS Backup for policies.

## Infrastructure-as-Code Baseline
- **Framework**: **Terraform** with AWS provider and Terragrunt for environment orchestration.
- **State Management**
  - Remote state stored in S3 with DynamoDB state locking.
  - Workspace per environment (dev/staging/prod) with variable files controlling scaling and region placement.
- **Core Modules**
  - `networking` module: creates VPC (IPv4 + optional IPv6), public/private subnets across 3 AZs, NAT gateways (one per AZ for prod, single for lower envs), route tables, and VPC endpoints for S3, DynamoDB, and CloudWatch.
  - `security` module: IAM roles/policies for EKS workers, RDS access, CI/CD deploy role, AWS WAF ACL attached to ALB, security group definitions with least-privilege ingress/egress rules.
  - `compute` module: EKS cluster, managed node groups with auto-scaling, RDS PostgreSQL (Multi-AZ, encrypted), ElastiCache Redis (Multi-AZ), S3 buckets (app assets, backups, logs) with lifecycle policies.
  - `load_balancing` module: Application Load Balancer with HTTPS listeners (ACM-managed certs), target groups for EKS services, path-based routing, AWS WAF integration, and access logs to S3.
  - `observability` module: CloudWatch log groups, metrics alarms, X-Ray daemonset for tracing, AWS Distro for OpenTelemetry collectors, guardrails for log retention and metric filters.
  - `ci_cd` module: AWS CodePipeline/CodeBuild integration or GitHub Actions OIDC role; Terraform plan/apply steps gated via manual approval for production.
- **Auto-Scaling Strategy**
  - Cluster auto-scaler for EKS node groups with target utilization 60% CPU/Memory.
  - Horizontal Pod Autoscaler (HPA) per microservice tied to custom metrics (RPS, queue depth).
  - RDS auto-scaling for storage and read replicas; ElastiCache reserved capacity with reserved nodes for cost savings.

## Observability Strategy
- **Logging**
  - Application logs shipped to CloudWatch via Fluent Bit DaemonSet; retention policies tuned per environment (30 days dev, 90 days prod).
  - Structured logging (JSON) for correlation IDs, user/session context; integrate with OpenSearch for log analytics.
  - Enable AWS WAF logging and ALB access logs to S3 with Athena queries for ad-hoc analysis.
- **Metrics**
  - Prometheus metrics scraped via AWS Managed Prometheus; dashboards in Amazon Managed Grafana with SLO panels.
  - CloudWatch metrics for infrastructure (EKS nodes, RDS, Redis) and alarms integrated with SNS + PagerDuty for on-call escalation.
  - Define golden signals: latency, traffic, errors, saturation, plus business KPIs (bookings/hour).
- **Tracing**
  - OpenTelemetry instrumentation for web/API services exporting to AWS X-Ray and Managed Service for tracing.
  - Sampling strategy adjustable (e.g., 10% baseline, 100% for errors) with trace linkage to logs via correlation IDs.

## Backup and Disaster Recovery
- **Data Backups**
  - RDS automated snapshots (35-day retention) plus daily manual snapshots replicated cross-region (us-west-2).
  - S3 buckets with versioning and cross-region replication for critical assets/logs.
  - Redis backup via daily RDB snapshots stored in S3 with server-side encryption.
- **Disaster Recovery Tiers**
  - Primary region: us-east-1; secondary warm-standby in us-west-2 with minimal EKS worker nodes running and database read replica promoted on failover.
  - Utilize Route 53 health checks and failover routing policies to shift traffic during DR events.
  - Regular DR runbooks tested semi-annually; include recovery time objective (RTO) of 2 hours and recovery point objective (RPO) of 15 minutes for transactional data.
- **Compliance & Security for Backups**
  - All backups encrypted with KMS CMKs; IAM policies restrict restore access to break-glass roles.
  - Integrate AWS Backup to orchestrate policies, auditing, and lifecycle transitions to Glacier Deep Archive for long-term retention.

## CI/CD Integration
- GitHub Actions pipelines using OIDC to assume AWS deploy role with limited permissions.
- Pipeline stages: lint/test → build container images (ECR) → Terraform plan/apply → deploy to EKS via Helm.
- Security scans (Snyk/Trivy) integrated pre-deploy; pipeline artifacts stored in S3 with lifecycle rules.
- Manual approval gate for production deploys, with Slack notifications and audit logs stored in CloudTrail.
