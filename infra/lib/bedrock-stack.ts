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

    // inference profile을 사용해야 on-demand 호출이 가능
    const foundationModelId =
      "us.anthropic.claude-sonnet-4-5-20250929-v1:0";
    const embeddingModelArn = `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v2:0`;
    const agentModelArn = `arn:aws:bedrock:${region}:${accountId}:inference-profile/${foundationModelId}`;

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
        VectorIngestionConfiguration: {
          ChunkingConfiguration: {
            ChunkingStrategy: "HIERARCHICAL",
            HierarchicalChunkingConfiguration: {
              LevelConfigurations: [
                {
                  MaxTokens: 1500, // 부모 청크 - 큰 문맥 보존
                },
                {
                  MaxTokens: 300, // 자식 청크 - 검색 단위
                },
              ],
              OverlapTokens: 60,
            },
          },
          ParsingConfiguration: {
            ParsingStrategy: "BEDROCK_FOUNDATION_MODEL",
            BedrockFoundationModelConfiguration: {
              ModelArn: `arn:aws:bedrock:${region}:${accountId}:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0`,
              ParsingPrompt: {
                ParsingPromptText: [
                  "Additional instructions for this document set:",
                  "",
                  "1. This document contains many statistical charts with ranked lists and percentage values (e.g. 'AI and big data: 87% net increase'). When converting these charts to tables, always include the exact percentage or numerical value for every item in the ranking. Do not truncate rankings - include all items shown in the chart.",
                  "",
                  "2. Many figures show side-by-side Industry vs Global comparisons. Always preserve both values in separate columns.",
                  "",
                  "3. For job growth/decline figures (e.g. Figure 2.2, 2.3), include both the job title and its exact net growth percentage in the table.",
                  "",
                  "4. For skill-related figures (e.g. Figure 3.3, 3.4, 3.5), preserve the full skill name, its category (Cognitive, Technology, Self-efficacy, etc.), and the exact percentage value.",
                  "",
                  "5. Preserve all figure and table identifiers (e.g. 'FIGURE 2.2', 'TABLE A1') as markdown headings so they are searchable.",
                ].join("\n"),
              },
            },
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
      actions: [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:GetInferenceProfile",
        "bedrock:GetFoundationModel",
      ],
      resources: [
        agentModelArn,
        `arn:aws:bedrock:${region}::foundation-model/*`,
        `arn:aws:bedrock:${region}:${accountId}:inference-profile/*`,
        `arn:aws:bedrock:us-east-1::foundation-model/*`,
        `arn:aws:bedrock:us-east-2::foundation-model/*`,
        `arn:aws:bedrock:us-west-1::foundation-model/*`,
      ],
    }));

    // KB Role에 Foundation Model Parser 권한 추가
    kbRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "bedrock:InvokeModel",
        "bedrock:GetInferenceProfile",
      ],
      resources: [
        `arn:aws:bedrock:*:${accountId}:inference-profile/*`,
        `arn:aws:bedrock:*::foundation-model/*`,
      ],
    }));

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ["bedrock:Retrieve"],
      resources: [`arn:aws:bedrock:${region}:${accountId}:knowledge-base/*`],
    }));

    // ── Bedrock Agent ──
    const agentInstruction = [
      "You are the AI Tribunal of Career Doomsday Clock.",
      "You analyze user career data and deliver verdicts in a cold, dystopian tone.",
      "Your judgments are grounded in real labor market data from the Future of Jobs Report 2025, retrieved from the Knowledge Base.",
      "",
      "## Mission",
      "1. Predict D-Day: years until the user's job is substantially replaced by AI.",
      "2. Analyze 3-5 key skills with AI replacement probability and time horizon.",
      "3. Suggest exactly 3 future career cards based on the user's current skills.",
      "",
      "## Knowledge Base Usage",
      "Search the Knowledge Base to ground your analysis in real data.",
      "You MUST limit your Knowledge Base searches to a maximum of 2 queries total.",
      "Combine multiple topics into a single broad query rather than making separate searches for each topic.",
      'For example, search "software developer automation emerging roles skill trends 2025 2030" instead of making 5 separate queries.',
      "After completing your searches, proceed directly to generating the final response. Do NOT search again.",
      "",
      "## Input Interpretation Guidelines",
      "1. If the user's input contains typos in job titles or skill names, auto-correct to the closest valid term.",
      "   Examples: '개발ㅈ' → '개발자', 'Pytohn' → 'Python', '데이타분석' → '데이터 분석'",
      "2. If the user's job title or skills are unrealistic or nonsensical (e.g. 'space pirate', 'breathing'),",
      "   interpret them as the closest realistic equivalent and proceed with analysis.",
      "3. career_cards must recommend creative, future-oriented roles that are realistically achievable",
      "   — emerging jobs or evolved forms of existing ones",
      "   (e.g. 'AI Ethics Consultant', 'Prompt Engineer', 'Digital Twin Designer', 'AI-Human Collaboration Coordinator').",
      "   Exclude entirely fictional roles (e.g. 'Space Wizard').",
      "4. dday_reason must be 1-2 sentences summarizing the core basis for the D-Day prediction.",
      "5. Each roadmap step duration must be between 1 month and 12 months.",
      "   The total roadmap must be between 6 months and 3 years.",
      "",
      "## Output Format",
      "Your entire response must be a raw JSON object starting with { and ending with }.",
      "Do not wrap the output in markdown code fences (```). Do not include any text before or after the JSON.",
      "All string values within the JSON must be in the language specified in the user input.",
      "",
      '{',
      '  "dday": "<integer, minimum 1>",',
      '  "dday_reason": "<1-2 sentence summary>",',
      '  "skill_risks": [',
      '    {',
      '      "skill_name": "<skill name>",',
      '      "category": "<category>",',
      '      "replacement_prob": "<integer 0-100>",',
      '      "time_horizon": "<integer, years>",',
      '      "justification": "<dystopian-toned rationale>"',
      '    }',
      '  ],',
      '  "career_cards": [',
      '    {',
      '      "card_index": "<0, 1, or 2>",',
      '      "combo_formula": "[current job] + [relevant skills] = [new job title]",',
      '      "reason": "<recommendation rationale>",',
      '      "roadmap": [',
      '        { "step": "<step description>", "duration": "<e.g. 3개월>" }',
      '      ]',
      '    }',
      '  ]',
      '}',
      "",
      "## Rules",
      "- skill_risks: 3 to 5 items.",
      "- career_cards: exactly 3 items.",
      "- Output must be valid JSON only. No markdown, no code fences, no explanatory text.",
      "- Knowledge Base searches: maximum 2 queries total.",
    ].join("\n");

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
        Description: "Production agent alias - v5 system prompt update",
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
