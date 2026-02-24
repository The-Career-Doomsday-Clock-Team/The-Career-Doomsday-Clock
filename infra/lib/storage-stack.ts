import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export class StorageStack extends cdk.Stack {
  public readonly surveyTable: dynamodb.Table;
  public readonly skillGraphTable: dynamodb.Table;
  public readonly careerCardsTable: dynamodb.Table;
  public readonly guestbookTable: dynamodb.Table;
  public readonly kbBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── DynamoDB Tables ──

    this.surveyTable = new dynamodb.Table(this, "SurveyTable", {
      partitionKey: { name: "session_id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.skillGraphTable = new dynamodb.Table(this, "SkillGraphTable", {
      partitionKey: { name: "session_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "skill_name", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.careerCardsTable = new dynamodb.Table(this, "CareerCardsTable", {
      partitionKey: { name: "session_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "card_index", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.guestbookTable = new dynamodb.Table(this, "GuestbookTable", {
      partitionKey: { name: "entry_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "created_at", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI for guestbook: query all entries sorted by created_at (newest first)
    this.guestbookTable.addGlobalSecondaryIndex({
      indexName: "created_at-index",
      partitionKey: { name: "gsi_pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "created_at", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ── S3 Bucket for Knowledge Base source files ──

    this.kbBucket = new s3.Bucket(this, "KnowledgeBaseBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy PDF files from pdfdata/ to S3 bucket
    new s3deploy.BucketDeployment(this, "DeployPdfData", {
      sources: [s3deploy.Source.asset("../pdfdata")],
      destinationBucket: this.kbBucket,
      destinationKeyPrefix: "pdfdata",
    });
  }
}
