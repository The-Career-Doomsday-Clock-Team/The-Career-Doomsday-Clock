import * as cdk from "aws-cdk-lib";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface FrontendStackProps extends cdk.StackProps {
  /** API Gateway 엔드포인트 URL */
  apiUrl: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // Secrets Manager에서 GitHub 토큰 가져오기
    const githubToken = secretsmanager.Secret.fromSecretNameV2(
      this, "GitHubToken", "dooms/github-token"
    );

    const buildSpecYaml = [
      "version: 1",
      "applications:",
      "  - appRoot: frontend",
      "    frontend:",
      "      phases:",
      "        preBuild:",
      "          commands:",
      "            - npm ci",
      "        build:",
      "          commands:",
      "            - npm run build",
      "      artifacts:",
      "        baseDirectory: out",
      "        files:",
      "          - '**/*'",
      "      cache:",
      "        paths:",
      "          - node_modules/**/*",
    ].join("\n");

    // Amplify IAM 서비스 역할
    const amplifyRole = new iam.Role(this, "AmplifyRole", {
      assumedBy: new iam.ServicePrincipal("amplify.amazonaws.com"),
      description: "Amplify service role for Career Doomsday Clock frontend",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess-Amplify"),
      ],
    });

    // ── Amplify App (GitHub 연동) ──
    const amplifyApp = new amplify.CfnApp(this, "CareerDoomsdayFrontend", {
      name: "career-doomsday-clock",
      repository: "https://github.com/The-Career-Doomsday-Clock-Team/The-Career-Doomsday-Clock",
      accessToken: githubToken.secretValue.unsafeUnwrap(),
      iamServiceRole: amplifyRole.roleArn,
      platform: "WEB",
      environmentVariables: [
        {
          name: "NEXT_PUBLIC_API_URL",
          value: props.apiUrl,
        },
        {
          name: "AMPLIFY_MONOREPO_APP_ROOT",
          value: "frontend",
        },
      ],
      buildSpec: buildSpecYaml,
      // 정적 export 빌드이므로 각 경로별 HTML 파일이 존재
      // SPA 리다이렉트 대신 404 fallback만 설정
      customRules: [
        {
          source: "/<*>",
          target: "/index.html",
          status: "404-200",
        },
      ],
    });

    // ── main 브랜치 (GitHub 연동, 자동 빌드) ──
    new amplify.CfnBranch(this, "MainBranch", {
      appId: amplifyApp.attrAppId,
      branchName: "main",
      enableAutoBuild: true,
      stage: "PRODUCTION",
    });

    // ── 출력 ──
    new cdk.CfnOutput(this, "AmplifyAppId", {
      value: amplifyApp.attrAppId,
      description: "Amplify 앱 ID",
    });

    new cdk.CfnOutput(this, "AmplifyDefaultDomain", {
      value: `https://main.${amplifyApp.attrDefaultDomain}`,
      description: "Amplify 기본 도메인 URL",
    });
  }
}
