import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface ApiStackProps extends cdk.StackProps {
  surveyTable: dynamodb.Table;
  skillGraphTable: dynamodb.Table;
  careerCardsTable: dynamodb.Table;
  guestbookTable: dynamodb.Table;
  kbBucket: s3.Bucket;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // ── 공통 Lambda 설정 ──
    const commonRuntime = lambda.Runtime.PYTHON_3_12;
    const commonCode = lambda.Code.fromAsset("../lambda");
    const commonMemory = 256;
    const commonTimeout = cdk.Duration.seconds(30);

    // ── Lambda 함수 6개 정의 ──

    const surveyHandler = new lambda.Function(this, "SurveyHandler", {
      runtime: commonRuntime,
      code: commonCode,
      memorySize: commonMemory,
      timeout: commonTimeout,
      logGroup: new logs.LogGroup(this, "SurveyHandlerLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      handler: "handlers.survey_handler.handler",
      description: "설문 저장 및 분석 트리거",
      environment: {
        SURVEY_TABLE_NAME: props.surveyTable.tableName,
        ANALYZE_FUNCTION_NAME: "", // analyze_handler ARN은 아래에서 설정
      },
    });

    const analyzeHandler = new lambda.Function(this, "AnalyzeHandler", {
      runtime: commonRuntime,
      code: commonCode,
      memorySize: 512,
      timeout: cdk.Duration.seconds(120),
      logGroup: new logs.LogGroup(this, "AnalyzeHandlerLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      handler: "handlers.analyze_handler.handler",
      description: "Bedrock Agent 호출 및 분석 결과 저장",
      environment: {
        SURVEY_TABLE_NAME: props.surveyTable.tableName,
        SKILL_GRAPH_TABLE_NAME: props.skillGraphTable.tableName,
        CAREER_CARDS_TABLE_NAME: props.careerCardsTable.tableName,
        BEDROCK_AGENT_ID: "", // 배포 후 실제 Agent ID로 교체
        BEDROCK_AGENT_ALIAS_ID: "", // 배포 후 실제 Alias ID로 교체
      },
    });

    // Bedrock Agent 호출 권한 부여
    analyzeHandler.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["bedrock:InvokeAgent"],
        resources: ["*"], // 배포 후 특정 Agent ARN으로 제한 권장
      })
    );

    // survey_handler에 analyze_handler 함수명 환경변수 설정
    surveyHandler.addEnvironment(
      "ANALYZE_FUNCTION_NAME",
      analyzeHandler.functionName
    );

    const resultHandler = new lambda.Function(this, "ResultHandler", {
      runtime: commonRuntime,
      code: commonCode,
      memorySize: commonMemory,
      timeout: commonTimeout,
      logGroup: new logs.LogGroup(this, "ResultHandlerLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      handler: "handlers.result_handler.handler",
      description: "세션별 분석 결과 조회",
      environment: {
        SURVEY_TABLE_NAME: props.surveyTable.tableName,
        SKILL_GRAPH_TABLE_NAME: props.skillGraphTable.tableName,
        CAREER_CARDS_TABLE_NAME: props.careerCardsTable.tableName,
      },
    });

    const guestbookPostHandler = new lambda.Function(
      this,
      "GuestbookPostHandler",
      {
        runtime: commonRuntime,
        code: commonCode,
        memorySize: commonMemory,
        timeout: commonTimeout,
        logGroup: new logs.LogGroup(this, "GuestbookPostHandlerLogs", {
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        handler: "handlers.guestbook_post_handler.handler",
        description: "방명록 등록",
        environment: {
          GUESTBOOK_TABLE_NAME: props.guestbookTable.tableName,
        },
      }
    );

    const guestbookGetHandler = new lambda.Function(
      this,
      "GuestbookGetHandler",
      {
        runtime: commonRuntime,
        code: commonCode,
        memorySize: commonMemory,
        timeout: commonTimeout,
        logGroup: new logs.LogGroup(this, "GuestbookGetHandlerLogs", {
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        handler: "handlers.guestbook_get_handler.handler",
        description: "방명록 목록 조회 (페이지네이션)",
        environment: {
          GUESTBOOK_TABLE_NAME: props.guestbookTable.tableName,
        },
      }
    );

    const reactionHandler = new lambda.Function(this, "ReactionHandler", {
      runtime: commonRuntime,
      code: commonCode,
      memorySize: commonMemory,
      timeout: commonTimeout,
      logGroup: new logs.LogGroup(this, "ReactionHandlerLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      handler: "handlers.reaction_handler.handler",
      description: "이모지 반응 추가 (DynamoDB ADD)",
      environment: {
        GUESTBOOK_TABLE_NAME: props.guestbookTable.tableName,
      },
    });

    // ── IAM 최소 권한 부여 ──

    // survey_handler: survey 테이블 읽기/쓰기 + analyze_handler 비동기 호출
    props.surveyTable.grantReadWriteData(surveyHandler);
    analyzeHandler.grantInvoke(surveyHandler);

    // analyze_handler: survey, skill_graph, career_cards 테이블 읽기/쓰기
    props.surveyTable.grantReadWriteData(analyzeHandler);
    props.skillGraphTable.grantReadWriteData(analyzeHandler);
    props.careerCardsTable.grantReadWriteData(analyzeHandler);

    // result_handler: survey, skill_graph, career_cards 테이블 읽기
    props.surveyTable.grantReadData(resultHandler);
    props.skillGraphTable.grantReadData(resultHandler);
    props.careerCardsTable.grantReadData(resultHandler);

    // guestbook_post_handler: guestbook 테이블 쓰기
    props.guestbookTable.grantWriteData(guestbookPostHandler);

    // guestbook_get_handler: guestbook 테이블 읽기
    props.guestbookTable.grantReadData(guestbookGetHandler);

    // reaction_handler: guestbook 테이블 읽기/쓰기 (ADD 연산)
    props.guestbookTable.grantReadWriteData(reactionHandler);

    // ── API Gateway REST API ──

    this.api = new apigateway.RestApi(this, "CareerDoomsdayApi", {
      restApiName: "Career Doomsday Clock API",
      description: "Career Doomsday Clock 백엔드 API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
      },
      deployOptions: {
        stageName: "prod",
        throttlingRateLimit: 50,
        throttlingBurstLimit: 100,
      },
    });

    // ── 엔드포인트 라우팅 ──

    // POST /survey
    const surveyResource = this.api.root.addResource("survey");
    surveyResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(surveyHandler)
    );

    // GET /result/{sid}
    const resultResource = this.api.root.addResource("result");
    const resultSidResource = resultResource.addResource("{sid}");
    resultSidResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(resultHandler)
    );

    // POST /guestbook, GET /guestbook
    const guestbookResource = this.api.root.addResource("guestbook");
    guestbookResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(guestbookPostHandler)
    );
    guestbookResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(guestbookGetHandler)
    );

    // POST /guestbook/{id}/reaction
    const guestbookIdResource = guestbookResource.addResource("{id}");
    const reactionResource = guestbookIdResource.addResource("reaction");
    reactionResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(reactionHandler)
    );

    // ── 출력 ──

    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.api.url,
      description: "API Gateway 엔드포인트 URL",
    });
  }
}
