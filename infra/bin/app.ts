#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { StorageStack } from "../lib/storage-stack";
import { ApiStack } from "../lib/api-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const storageStack = new StorageStack(app, "CareerDoomsdayStorageStack", {
  description: "Career Doomsday Clock — DynamoDB tables and S3 bucket",
});

const apiStack = new ApiStack(app, "CareerDoomsdayApiStack", {
  description: "Career Doomsday Clock — API Gateway and Lambda functions",
  surveyTable: storageStack.surveyTable,
  skillGraphTable: storageStack.skillGraphTable,
  careerCardsTable: storageStack.careerCardsTable,
  guestbookTable: storageStack.guestbookTable,
  kbBucket: storageStack.kbBucket,
});

new FrontendStack(app, "CareerDoomsdayFrontendStack", {
  description: "Career Doomsday Clock — Amplify 프론트엔드 호스팅",
  apiUrl: apiStack.api.url,
});
