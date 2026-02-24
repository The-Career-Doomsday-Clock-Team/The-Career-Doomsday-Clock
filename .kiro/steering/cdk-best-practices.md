# CDK Best Practices

## General Guidelines

- Use TypeScript for CDK infrastructure code
- Follow the AWS Well-Architected Framework principles
- Use CDK constructs at the L2 (higher-level) level when available
- Tag all resources with environment, project, and owner tags
- Use `cdk.RemovalPolicy.DESTROY` only in development environments
- Use `cdk.RemovalPolicy.RETAIN` for production data stores

## Project Structure

- Organize stacks by domain or service boundary
- Keep stack files in a dedicated `infra/` or `cdk/` directory
- Separate stateful resources (DynamoDB, S3) from stateless resources (Lambda, API Gateway)
- Use a single `App` entry point that instantiates all stacks

## Naming Conventions

- Stack names: `PascalCase` (e.g., `CareerDoomsdayApiStack`)
- Construct IDs: `PascalCase` (e.g., `SurveyTable`)
- Resource names: Use stack-generated names when possible to avoid conflicts
- Environment-specific prefixes when explicit naming is required

## DynamoDB

- Always define partition key and sort key explicitly
- Use `billingMode: BillingMode.PAY_PER_REQUEST` for unpredictable workloads
- Define GSIs in the same construct as the table
- Enable point-in-time recovery for production tables

## Lambda

- Set memory and timeout explicitly for every function
- Use environment variables for configuration, not hardcoded values
- Bundle Lambda code using `NodejsFunction` or `PythonFunction` constructs
- Set `logRetention` to avoid unbounded CloudWatch log growth
- Apply least-privilege IAM policies using `grantRead`, `grantWrite`, `grantReadWrite`

## API Gateway

- Use `RestApi` or `HttpApi` with explicit CORS configuration
- Define request validators and models for input validation
- Use Lambda proxy integration for simplicity
- Enable CloudWatch logging for API Gateway stages

## S3

- Block all public access by default
- Enable server-side encryption (SSE-S3 or SSE-KMS)
- Enable versioning for important buckets
- Set lifecycle rules to manage storage costs

## Security

- Never hardcode secrets; use AWS Secrets Manager or SSM Parameter Store
- Use IAM roles with least-privilege policies
- Enable AWS CloudTrail for auditing
- Use VPC endpoints for services when applicable

## Testing

- Write unit tests for CDK stacks using `assertions` module
- Test that critical resources are created with expected properties
- Use snapshot tests for detecting unintended infrastructure changes
- Run `cdk synth` in CI/CD to catch synthesis errors early

## Deployment

- Use `cdk diff` before every deployment to review changes
- Use separate AWS accounts or at minimum separate stacks for dev/staging/prod
- Implement CI/CD pipelines for automated deployments
- Use `cdk destroy` carefully; protect stateful resources with removal policies
