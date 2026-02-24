# Python Best Practices (Lambda)

## General Guidelines

- Use Python 3.12+ for all Lambda functions
- Follow PEP 8 style guidelines
- Use type hints for all function signatures
- Keep Lambda handlers thin; delegate logic to service modules
- Use `dataclasses` or `pydantic` for data models

## Project Structure

```
lambda/
  handlers/        # Lambda handler entry points
  services/        # Business logic
  models/          # Data models and schemas
  utils/           # Shared utilities
  requirements.txt # Dependencies
  tests/           # Unit and property tests
```

## Lambda Handler Pattern

```python
def handler(event: dict, context) -> dict:
    """Keep handlers thin - parse input, call service, format output."""
    try:
        body = parse_input(event)
        result = service.process(body)
        return format_response(200, result)
    except ValidationError as e:
        return format_response(400, {"error": str(e)})
    except Exception as e:
        logger.exception("Unexpected error")
        return format_response(500, {"error": "Internal server error"})
```

## Error Handling

- Use specific exception types, not bare `except`
- Return structured error responses with appropriate HTTP status codes
- Log exceptions with full stack traces using `logger.exception()`
- Never expose internal error details to clients

## DynamoDB Integration

- Use `boto3.resource` for simple operations, `boto3.client` for batch operations
- Use `decimal.Decimal` for numeric values in DynamoDB
- Handle `ConditionalCheckFailedException` for optimistic locking
- Use `ExpressionAttributeNames` to avoid reserved word conflicts

## Logging

- Use Python `logging` module, not `print()`
- Set log level via environment variable
- Include correlation IDs (session_id, request_id) in log messages
- Use structured logging (JSON format) for production

## Security

- Never hardcode credentials or secrets
- Use IAM roles for AWS service access
- Validate and sanitize all input data
- Use environment variables for configuration

## Dependencies

- Pin dependency versions in `requirements.txt`
- Keep dependencies minimal to reduce cold start times
- Use Lambda layers for shared dependencies
- Avoid importing unused modules

## Testing

- Use `pytest` as the test framework
- Use `hypothesis` for property-based testing
- Use `moto` for mocking AWS services in tests
- Write tests for business logic, not AWS SDK calls
- Keep test files alongside source files or in a parallel `tests/` directory
