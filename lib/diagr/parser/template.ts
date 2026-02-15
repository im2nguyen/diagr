export const starterDiagram = `title: "AWS serverless ingestion"
filename: "aws-serverless-ingestion"
theme: "light"

edges: |
  clients --> apigw [label="https", color="deepskyblue", type=dash]
  apigw --> lambda [label="invoke", color="goldenrod"]
  lambda --> queue [label="enqueue", color="slategray", type=dot]
  queue --> worker [label="batch", color="mediumseagreen"]
  worker --> store [label="write", color="tomato", type=solid]
  worker --> notify [label="alert", color="plum", type=dash]

layout:
  direction: LR
  xGap: 130
  yGap: 90

nodes:
  - id: "clients"
    label: "Producers"
    renderer: "cards"
    data:
      cards:
        - label: "Web"
          tone: "dodgerblue"
          icon: "browser"
          icons: 6
        - label: "Mobile"
          tone: "mediumseagreen"
          icon: "device-mobile"
          icons: 6

  - id: "apigw"
    label: "Amazon API Gateway"
    renderer: "cards"
    data:
      cards:
        - label: "REST API"
          tone: "steelblue"
          icon: "cloud"
          icons: 8

  - id: "lambda"
    label: "AWS Lambda"
    renderer: "code"
    data:
      code: |
        interface EventEnvelope {
          request_id: string;
          tenant_id: string;
          payload: Record<string, unknown>;
          created_at: string;
        }

  - id: "queue"
    label: "Amazon SQS"
    renderer: "cards"
    data:
      cards:
        - label: "Buffer"
          tone: "goldenrod"
          icon: "stack"
          icons: 8

  - id: "worker"
    label: "ECS worker"
    renderer: "cards"
    data:
      cards:
        - label: "Processor"
          tone: "mediumseagreen"
          icon: "cpu"
          icons: 8

  - id: "store"
    label: "DynamoDB"
    renderer: "image"
    data:
      image: "https://upload.wikimedia.org/wikipedia/commons/f/fd/DynamoDB.png"
      height: 100

  - id: "notify"
    label: "CloudWatch alarms"
    renderer: "markdown"
    data:
      markdown: |
        ### Notifications
        - DLQ depth > threshold
        - Lambda error rate > 1%
        - worker timeout spike
`;

const pipelineExample = `title: "Event processing pipeline"
filename: "event-processing-pipeline"
theme: "light"

edges: |
  ingest --> queue [label="publish"]
  queue --> workers [label="consume"]
  workers --> warehouse [label="load"]
  workers <--> alerts [label="notify"]

layout:
  direction: TB
  xGap: 120
  yGap: 80

nodes:
  - id: "ingest"
    label: "Event ingest"
    renderer: "cards"
    data:
      cards:
        - label: "API"
          tone: "dodgerblue"
          icon: "cloud-arrow-up"
          icons: 4
        - label: "SDK"
          tone: "steelblue"
          icon: "code"
          icons: 4

  - id: "queue"
    label: "Message queue"
    renderer: "cards"
    data:
      cards:
        - label: "Kafka"
          tone: "goldenrod"
          icon: "stack"
          icons: 8

  - id: "workers"
    label: "Transform workers"
    renderer: "code"
    data:
      code: |
        interface Event {
          id: string;
          source: string;
          payload: Record<string, unknown>;
          created_at: string;
        }

  - id: "warehouse"
    label: "Analytics warehouse"
    renderer: "image"
    data:
      image: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/snowflake-color.png"
      height: 80

  - id: "alerts"
    label: "Ops alerts"
    renderer: "markdown"
    data:
      markdown: |
        ### Alert rules
        - retry failures > 5%
        - queue lag > 30s
        - worker crash loop
`;

const apiFlowExample = `title: "API request lifecycle"
filename: "api-request-lifecycle"
theme: "dark"

edges: |
  client --> gateway [label="ingest", color="deepskyblue", type=dash]
  gateway --> service [label="forward", color="goldenrod"]
  service --> db [label="read/write", color="mediumseagreen", type=solid]
  service --> cache [label="warm", color="tomato", type=dot]
  cache --> service [label="hit", color="plum", type=dash]

layout:
  direction: LR
  xGap: 110
  yGap: 80

nodes:
  - id: "client"
    label: "Client apps"
    renderer: "cards"
    data:
      cards:
        - label: "Web"
          tone: "royalblue"
          icon: "browser"
          icons: 6
        - label: "Mobile"
          tone: "mediumseagreen"
          icon: "device-mobile"
          icons: 6

  - id: "gateway"
    label: "API gateway"
    renderer: "cards"
    data:
      cards:
        - label: "Rate limit"
          tone: "goldenrod"
          icon: "shield-check"
          icons: 4

  - id: "service"
    label: "Core service"
    renderer: "code"
    data:
      code: |
        interface RequestContext {
          request_id: string;
          actor_id?: string;
          tenant_id: string;
          trace_id: string;
        }

  - id: "db"
    label: "Postgres"
    renderer: "image"
    data:
      image: "https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg"
      height: 80

  - id: "cache"
    label: "Redis cache"
    renderer: "cards"
    data:
      cards:
        - label: "Hot keys"
          tone: "tomato"
          icon: "lightning"
          icons: 9
`;

const orgMapExample = `title: "Org capability map"
filename: "org-capability-map"
theme: "light"

edges: |
  product --> platform [label="handoff"]
  platform --> growth [label="enable"]
  growth --> product [label="feedback"]

layout:
  direction: TB
  xGap: 900
  yGap: 140

nodes:
  - id: "product"
    label: "Product"
    renderer: "groupCard"
    data:
      caption: "Owns roadmap"
      ids: ["product_cards"]

  - id: "platform"
    label: "Platform"
    renderer: "groupCard"
    data:
      caption: "Runs shared systems"
      ids: ["platform_cards", "platform_code"]

  - id: "growth"
    label: "Growth"
    renderer: "groupCard"
    data:
      caption: "Optimizes funnel"
      ids: ["growth_cards"]

  - id: "product_cards"
    label: "Teams"
    renderer: "cards"
    data:
      cards:
        - label: "PM + Design"
          tone: "dodgerblue"
          icon: "users-three"
          icons: 8

  - id: "platform_cards"
    label: "Services"
    renderer: "cards"
    data:
      cards:
        - label: "Infra"
          tone: "mediumseagreen"
          icon: "server"
          icons: 8

  - id: "platform_code"
    label: "Contract"
    renderer: "code"
    data:
      code: |
        interface Capability {
          name: string;
          owner: string;
          tier: "core" | "shared" | "experimental";
        }

  - id: "growth_cards"
    label: "Programs"
    renderer: "cards"
    data:
      cards:
        - label: "Lifecycle"
          tone: "goldenrod"
          icon: "chart-line-up"
          icons: 8
`;

export const diagramExamples = [
  { id: 'api-lifecycle', label: 'API Lifecycle', source: apiFlowExample },
  { id: 'aws-serverless', label: 'AWS Serverless', source: starterDiagram },
  { id: 'event-pipeline', label: 'Event Pipeline', source: pipelineExample },
  {
    id: 'org-capability-map',
    label: 'Org Capability Map',
    source: orgMapExample,
    themeCss: `#diagr-diagram-canvas {
  font-family: "IBM Plex Sans", "Plus Jakarta Sans", sans-serif;
}`,
  },
] as const;
