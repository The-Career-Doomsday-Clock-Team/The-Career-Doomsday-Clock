# Security Best Practices

## General Principles

- Follow the principle of least privilege for all IAM policies
- Never store secrets in code, environment variables, or version control
- Use AWS Secrets Manager or SSM Parameter Store for sensitive configuration
- Enable encryption at rest and in transit for all data stores
- Validate and sanitize all user input on the server side

## IAM

- Create specific IAM roles per Lambda function
- Use resource-level permissions (not `*`) wherever possible
- Avoid using AWS managed policies with broad permissions
- Review IAM policies regularly for unused permissions
- Use IAM policy conditions to restrict access by source IP, VPC, or time

## API Security

- Enable CORS with specific allowed origins, not `*` in production
- Use request validation at API Gateway level
- Implement rate limiting to prevent abuse
- Use API keys or usage plans for external consumers
- Validate Content-Type headers

## Data Protection

- Encrypt DynamoDB tables with AWS-managed or customer-managed KMS keys
- Enable S3 server-side encryption (SSE-S3 minimum)
- Block all public access on S3 buckets
- Use HTTPS for all API endpoints (enforced by API Gateway)
- Do not store PII unless absolutely necessary

## Input Validation

- Validate all input on the server side, regardless of client-side validation
- Use allowlists for expected input formats
- Sanitize text inputs to prevent injection attacks
- Limit input lengths to reasonable maximums
- Reject unexpected fields in API requests

## Session Management

- Use UUID v4 for anonymous session IDs
- Store session IDs in `sessionStorage` (not `localStorage`) for ephemeral sessions
- Do not include sensitive data in session identifiers
- Set reasonable session expiration times

## Logging and Monitoring

- Do not log sensitive data (passwords, tokens, PII)
- Enable CloudTrail for API auditing
- Set up CloudWatch alarms for unusual activity patterns
- Monitor for failed authentication attempts and rate limit violations

## Dependency Security

- Regularly update dependencies to patch known vulnerabilities
- Use `npm audit` and `pip audit` to check for vulnerabilities
- Pin dependency versions to avoid supply chain attacks
- Review new dependencies before adding them to the project

## Infrastructure

- Use private subnets for Lambda functions when accessing internal resources
- Enable VPC Flow Logs for network monitoring
- Use security groups with minimal inbound rules
- Enable AWS Config for compliance monitoring
