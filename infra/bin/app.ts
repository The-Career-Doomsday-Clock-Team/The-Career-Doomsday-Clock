#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { StorageStack } from "../lib/storage-stack";
import { BedrockStack } from "../lib/bedrock-stack";
import { ApiStack } from "../lib/api-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const storageStack = new StorageStack(app, "CareerDoomsdayStorageStack", {
  description: "Career Doomsday Clock — DynamoDB tables and S3 bucket",
});

const bedrockStack = new BedrockStack(app, "CareerDoomsdayBedrockStack", {
  description: "Career Doomsday Clock — Bedrock Knowledge Base and Agent",
  kbBucket: storageStack.kbBucket,
});
bedrockStack.addDependency(storageStack);

const apiStack = new ApiStack(app, "CareerDoomsdayApiStack", {
  description: "Career Doomsday Clock — API Gateway and Lambda functions",
  surveyTable: storageStack.surveyTable,
  skillGraphTable: storageStack.skillGraphTable,
  careerCardsTable: storageStack.careerCardsTable,
  guestbookTable: storageStack.guestbookTable,
  kbBucket: storageStack.kbBucket,
  bedrockAgentId: bedrockStack.agentId,
  bedrockAgentAliasId: bedrockStack.agentAliasId,
});
apiStack.addDependency(bedrockStack);

new FrontendStack(app, "CareerDoomsdayFrontendStack", {
  description: "Career Doomsday Clock — Amplify frontend hosting",
  apiUrl: apiStack.api.url,
});
