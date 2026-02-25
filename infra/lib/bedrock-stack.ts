import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cr from "aws-cdk-lib/custom-resources";
import * as logs from "aws-cdk-lib/aws-logs";
import * as opensearchserverless from "aws-cdk-lib/aws-opensearchserverless";
import { Construct } from "constructs";
import * as path from "path";

export interface BedrockStackProps extends cdk.StackProps {
  kbBucket: s3.Bucket;
}

export class BedrockStack extends cdk.Stack {
  public readonly agentId: string;
  public readonly agentAliasId: string;

  constructor(scope: Construct, id: string, props: BedrockStackProps) {
    super(scope, id, props);

    const accountId = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    const foundationModelId = "anthropic.claude-sonnet-4-5-20250929-v1:0";
    const embeddingModelArn = `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v2:0`;
    const agentModelArn = `arn:aws:bedrock:${region}::foundation-model/${foundationModelId}`;

    // ── OpenSearch Serverless ──
    const collectionName = "career-doom-kb";

    const encryptionPolicy = new opensearchserverless.CfnSecurityPolicy(
      this, "OSSEncryptionPolicy", {
        name: `${collectionName}-enc`,
        type: "encryption",
        policy: JSON.stringify({
          Rules: [{ ResourceType: "collection", Resource: [`collection/${collectionName}`] }],
          AWSOwnedKey: true,
        }),
      }
    );

    const networkPolicy = new opensearchserverless.CfnSecurityPolicy(
      this, "OSSNetworkPolicy", {
        name: `${collectionName}-net`,
        type: "network",
        policy: JSON.stringify([{
          Rules: [
            { ResourceType: "collection", Resource: [`collection/${collectionName}`] },
            { ResourceType: "dashboard", Resource: [`collection/${collectionName}`] },
          ],
          AllowFromPublic: true,
        }]),
      }
    );

    const ossCollection = new opensearchserverless.CfnCollection(
      this, "OSSCollection", {
        name: collectionName,
        type: "VECTORSEARCH",
        description: "Career Doomsday Clock KB vector store",
      }
    );
    ossCollection.addDependency(encryptionPolicy);
    ossCollection.addDependency(networkPolicy);

    // ── Knowledge Base IAM Role ──
    const kbRole = new iam.Role(this, "KnowledgeBaseRole", {
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      description: "Bedrock Knowledge Base execution role",
    });

    props.kbBucket.grantRead(kbRole);

    kbRole.addToPolicy(new iam.PolicyStatement({
      actions: ["aoss:APIAccessAll"],
      resources: [`arn:aws:aoss:${region}:${accountId}:collection/${ossCollection.attrId}`],
    }));

    kbRole.addToPolicy(new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      resources: [embeddingModelArn],
    }));

    // OSS Data Access Policy (KB Role + Index Creator Lambda)
    // Lambda role ARN은 아래에서 추가
    const indexCreatorRole = new iam.Role(this, "OSSIndexCreatorRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    indexCreatorRole.addToPolicy(new iam.PolicyStatement({
      actions: ["aoss:APIAccessAll"],
      resources: [`arn:aws:aoss:${region}:${accountId}:collection/${ossCollection.attrId}`],
    }));

    const dataAccessPolicy = new opensearchserverless.CfnAccessPolicy(
      this, "OSSDataAccessPolicy", {
        name: `${collectionName}-data`,
        type: "data",
        policy: JSON.stringify([{
          Rules: [
            {
              ResourceType: "collection",
              Resource: [`collection/${collectionName}`],
              Permission: [
                "aoss:CreateCollectionItems",
                "aoss:DeleteCollectionItems",
                "aoss:UpdateCollectionItems",
                "aoss:DescribeCollectionItems",
              ],
            },
            {
              ResourceType: "index",
              Resource: [`index/${collectionName}/*`],
              Permission: [
                "aoss:CreateIndex",
                "aoss:DeleteIndex",
                "aoss:UpdateIndex",
                "aoss:DescribeIndex",
                "aoss:ReadDocument",
                "aoss:WriteDocument",
              ],
            },
          ],
          Principal: [
            kbRole.roleArn,
            indexCreatorRole.roleArn,
          ],
        }]),
      }
    );
    dataAccessPolicy.addDependency(ossCollection);

    // ── Custom Resource: OSS Index Creator ──
    const indexCreatorFn = new lambda.Function(this, "OSSIndexCreatorFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "oss-index-creator", "package")),
      role: indexCreatorRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      logGroup: new logs.LogGroup(this, "OSSIndexCreatorLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    const indexCreatorProvider = new cr.Provider(this, "OSSIndexCreatorProvider", {
      onEventHandler: indexCreatorFn,
      logGroup: new logs.LogGroup(this, "OSSIndexCreatorProviderLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    const ossIndexResource = new cdk.CustomResource(this, "OSSIndexResource", {
      serviceToken: indexCreatorProvider.serviceToken,
      properties: {
        CollectionEndpoint: ossCollection.attrCollectionEndpoint,
        IndexName: "bedrock-knowledge-base-default-index",
      },
    });
    ossIndexResource.node.addDependency(dataAccessPolicy);
    ossIndexResource.node.addDependency(ossCollection);

    // ── Bedrock Knowledge Base ──
    const knowledgeBase = new cdk.CfnResource(this, "KnowledgeBase", {
      type: "AWS::Bedrock::KnowledgeBase",
      properties: {
        Name: "career-doomsday-kb",
        Description: "Future of Jobs Report 2025 Knowledge Base",
        RoleArn: kbRole.roleArn,
        KnowledgeBaseConfiguration: {
          Type: "VECTOR",
          VectorKnowledgeBaseConfiguration: {
            EmbeddingModelArn: embeddingModelArn,
          },
        },
        StorageConfiguration: {
          Type: "OPENSEARCH_SERVERLESS",
          OpensearchServerlessConfiguration: {
            CollectionArn: ossCollection.attrArn,
            VectorIndexName: "bedrock-knowledge-base-default-index",
            FieldMapping: {
              VectorField: "bedrock-knowledge-base-default-vector",
              TextField: "AMAZON_BEDROCK_TEXT_CHUNK",
              MetadataField: "AMAZON_BEDROCK_METADATA",
            },
          },
        },
      },
    });
    knowledgeBase.node.addDependency(ossIndexResource);
    knowledgeBase.node.addDependency(kbRole);

    // ── KB Data Source (S3) ──
    new cdk.CfnResource(this, "KBDataSource", {
      type: "AWS::Bedrock::DataSource",
      properties: {
        KnowledgeBaseId: knowledgeBase.getAtt("KnowledgeBaseId"),
        Name: "career-doomsday-pdf-source",
        Description: "Future of Jobs Report 2025 PDF data",
        DataSourceConfiguration: {
          Type: "S3",
          S3Configuration: {
            BucketArn: props.kbBucket.bucketArn,
            InclusionPrefixes: ["pdfdata/"],
          },
        },
      },
    });

    // ── Bedrock Agent IAM Role ──
    const agentRole = new iam.Role(this, "BedrockAgentRole", {
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      description: "Bedrock Agent execution role",
    });

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      resources: [agentModelArn],
    }));

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ["bedrock:Retrieve"],
      resources: [`arn:aws:bedrock:${region}:${accountId}:knowledge-base/*`],
    }));

    // ── Bedrock Agent ──
    const agentInstruction = [
      "You are the AI Tribunal of Career Doomsday Clock.",
      "Analyze user career data in a dystopian tone.",
      "Use the Future of Jobs Report 2025 from the Knowledge Base to ground your analysis with real data.",
      "Search the Knowledge Base thoroughly for relevant job market trends, skill demands, and automation risks.",
      "1. Predict D-Day (years until job replacement by AI) based on Knowledge Base data.",
      "2. Analyze 3-5 key skills with AI replacement probability (0-100%) and time horizon (years).",
      "3. Suggest 3 new career cards combining user strengths and hobbies with emerging job trends from the report.",
      "Respond ONLY in valid JSON format.",
    ].join(" ");

    const agent = new cdk.CfnResource(this, "BedrockAgent", {
      type: "AWS::Bedrock::Agent",
      properties: {
        AgentName: "career-doomsday-agent",
        Description: "Career Doomsday Clock analysis agent",
        AgentResourceRoleArn: agentRole.roleArn,
        FoundationModel: foundationModelId,
        Instruction: agentInstruction,
        IdleSessionTTLInSeconds: 600,
        AutoPrepare: true,
        KnowledgeBases: [{
          KnowledgeBaseId: knowledgeBase.getAtt("KnowledgeBaseId"),
          Description: "Future of Jobs Report 2025 data",
          KnowledgeBaseState: "ENABLED",
        }],
      },
    });
    agent.node.addDependency(agentRole);

    // ── Agent Alias ──
    const agentAlias = new cdk.CfnResource(this, "BedrockAgentAlias", {
      type: "AWS::Bedrock::AgentAlias",
      properties: {
        AgentId: agent.getAtt("AgentId"),
        AgentAliasName: "prod",
        Description: "Production agent alias",
      },
    });

    // ── Outputs ──
    this.agentId = agent.getAtt("AgentId").toString();
    this.agentAliasId = agentAlias.getAtt("AgentAliasId").toString();

    new cdk.CfnOutput(this, "KnowledgeBaseId", {
      value: knowledgeBase.getAtt("KnowledgeBaseId").toString(),
      description: "Bedrock Knowledge Base ID",
    });

    new cdk.CfnOutput(this, "AgentId", {
      value: this.agentId,
      description: "Bedrock Agent ID",
    });

    new cdk.CfnOutput(this, "AgentAliasId", {
      value: this.agentAliasId,
      description: "Bedrock Agent Alias ID",
    });

    new cdk.CfnOutput(this, "OSSCollectionEndpoint", {
      value: ossCollection.attrCollectionEndpoint,
      description: "OpenSearch Serverless collection endpoint",
    });
  }
}
