import * as cdk from "aws-cdk-lib";
import * as amplify from "aws-cdk-lib/aws-amplify";
import { Construct } from "constructs";

export interface FrontendStackProps extends cdk.StackProps {
  /** API Gateway 엔드포인트 URL */
  apiUrl: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

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
      "        baseDirectory: .next",
      "        files:",
      "          - '**/*'",
      "      cache:",
      "        paths:",
      "          - node_modules/**/*",
      "          - .next/cache/**/*",
    ].join("\n");

    // ── Amplify App ──
    const amplifyApp = new amplify.CfnApp(this, "CareerDoomsdayFrontend", {
      name: "career-doomsday-clock",
      platform: "WEB_COMPUTE",
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
    });

    // ── main 브랜치 ──
    new amplify.CfnBranch(this, "MainBranch", {
      appId: amplifyApp.attrAppId,
      branchName: "main",
      enableAutoBuild: true,
      stage: "PRODUCTION",
      framework: "Next.js - SSR",
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
