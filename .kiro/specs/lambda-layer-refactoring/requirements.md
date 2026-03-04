# Requirements Document

## Introduction

Lambda 함수 코드 구조를 리팩토링하여 공통 코드를 Lambda Layer로 분리하고, 각 Lambda 함수를 독립적인 폴더로 구성합니다. 이를 통해 코드 변경 감지를 개선하고, 개별 함수만 선택적으로 재배포할 수 있도록 합니다.

현재 모든 Lambda 함수가 전체 `lambda/` 폴더를 공유하는 `commonCode`를 사용하여, 한 함수의 코드만 수정해도 CDK가 변경을 감지하지 못하거나 모든 함수가 재배포되는 문제가 있습니다.

## Glossary

- **Lambda_Layer**: AWS Lambda에서 공통 코드, 라이브러리, 종속성을 여러 함수 간에 공유할 수 있도록 하는 배포 패키지
- **Function_Handler**: 각 Lambda 함수의 진입점 코드 파일
- **Common_Code**: 여러 Lambda 함수에서 공유하는 유틸리티, 모델, 서비스 코드
- **CDK_Stack**: AWS CDK로 정의된 인프라 코드 스택
- **Asset_Bundling**: CDK에서 Lambda 함수 코드를 패키징하는 프로세스
- **Deployment_Package**: Lambda 함수에 배포되는 최종 코드 패키지

## Requirements

### Requirement 1: Lambda Layer 생성

**User Story:** 개발자로서, 공통 코드를 Lambda Layer로 분리하여 여러 함수에서 재사용하고 싶습니다.

#### Acceptance Criteria

1. THE CDK_Stack SHALL create a Lambda_Layer containing Common_Code (utils, models, services)
2. THE Lambda_Layer SHALL follow the Python Lambda Layer directory structure (`python/` subdirectory)
3. THE Lambda_Layer SHALL include all dependencies from `requirements.txt`
4. THE Lambda_Layer SHALL be compatible with Python 3.12 runtime
5. WHEN Common_Code is modified, THE CDK_Stack SHALL detect the change and update the Lambda_Layer

### Requirement 2: 함수별 독립 폴더 구조

**User Story:** 개발자로서, 각 Lambda 함수를 독립적인 폴더로 분리하여 개별 관리하고 싶습니다.

#### Acceptance Criteria

1. THE Project_Structure SHALL organize each Lambda function in a separate directory under `lambda/functions/`
2. EACH Function_Directory SHALL contain its own `handler.py` file
3. EACH Function_Directory SHALL contain its own `requirements.txt` for function-specific dependencies
4. THE Function_Handler SHALL import Common_Code from the Lambda_Layer
5. THE Project_Structure SHALL maintain the following functions:
   - survey
   - analyze
   - result
   - guestbook_post
   - guestbook_get
   - reaction

### Requirement 3: CDK 스택 수정

**User Story:** 개발자로서, CDK 스택이 Lambda Layer와 개별 함수 경로를 사용하도록 수정하고 싶습니다.

#### Acceptance Criteria

1. THE CDK_Stack SHALL define the Lambda_Layer using `lambda.LayerVersion`
2. THE CDK_Stack SHALL reference individual function directories for each Lambda function
3. THE CDK_Stack SHALL attach the Lambda_Layer to all Lambda functions
4. THE CDK_Stack SHALL use `lambda.Code.fromAsset()` with function-specific paths
5. THE CDK_Stack SHALL preserve all existing IAM permissions and environment variables
6. THE CDK_Stack SHALL preserve all existing API Gateway endpoint configurations

### Requirement 4: 코드 변경 감지 개선

**User Story:** 개발자로서, 특정 Lambda 함수의 코드만 수정했을 때 해당 함수만 재배포되기를 원합니다.

#### Acceptance Criteria

1. WHEN a Function_Handler is modified, THE CDK_Stack SHALL detect the change for that specific function only
2. WHEN Common_Code is modified, THE CDK_Stack SHALL detect the Lambda_Layer change
3. WHEN a function-specific dependency is modified, THE CDK_Stack SHALL detect the change for that specific function only
4. THE Asset_Bundling SHALL generate unique hashes for each function's Deployment_Package
5. THE CDK_Stack SHALL NOT redeploy unmodified Lambda functions

### Requirement 5: 기존 핸들러 코드 마이그레이션

**User Story:** 개발자로서, 기존 핸들러 코드를 새로운 구조로 안전하게 마이그레이션하고 싶습니다.

#### Acceptance Criteria

1. THE Migration_Process SHALL move each handler from `lambda/handlers/` to `lambda/functions/{function_name}/handler.py`
2. THE Function_Handler SHALL update import statements to use Lambda_Layer modules
3. THE Function_Handler SHALL maintain identical business logic and behavior
4. THE Migration_Process SHALL preserve all existing handler function signatures
5. THE Migration_Process SHALL preserve all existing error handling logic

### Requirement 6: 공통 코드 Layer 구조화

**User Story:** 개발자로서, 공통 코드를 Lambda Layer 표준 구조로 재구성하고 싶습니다.

#### Acceptance Criteria

1. THE Lambda_Layer SHALL organize Common_Code under `lambda/layers/common/python/` directory
2. THE Lambda_Layer SHALL include `utils/` module with logging and response utilities
3. THE Lambda_Layer SHALL include `models/` module with data schemas
4. THE Lambda_Layer SHALL include `services/` module with validation logic
5. THE Lambda_Layer SHALL maintain all existing module interfaces and function signatures

### Requirement 7: 배포 스크립트 호환성

**User Story:** 개발자로서, 기존 배포 스크립트가 새로운 구조에서도 정상 작동하기를 원합니다.

#### Acceptance Criteria

1. THE Deployment_Script SHALL successfully synthesize the CDK_Stack with the new structure
2. THE Deployment_Script SHALL successfully deploy the Lambda_Layer before Lambda functions
3. THE Deployment_Script SHALL successfully deploy all Lambda functions with the Lambda_Layer attached
4. WHEN deployment fails, THE Deployment_Script SHALL provide clear error messages
5. THE Deployment_Script SHALL support incremental deployments (only changed resources)

### Requirement 8: 테스트 호환성 유지

**User Story:** 개발자로서, 기존 테스트 코드가 새로운 구조에서도 정상 작동하기를 원합니다.

#### Acceptance Criteria

1. THE Test_Suite SHALL run successfully against the new function structure
2. THE Test_Suite SHALL import Common_Code from the layer directory structure
3. THE Test_Suite SHALL maintain all existing test cases without modification
4. THE Test_Suite SHALL use `pytest` with the updated module paths
5. WHEN tests fail, THE Test_Suite SHALL provide clear error messages indicating the failure location

### Requirement 9: 롤백 안전성

**User Story:** 개발자로서, 문제 발생 시 이전 구조로 안전하게 롤백할 수 있기를 원합니다.

#### Acceptance Criteria

1. THE Migration_Process SHALL preserve the original `lambda/handlers/` directory until migration is verified
2. THE CDK_Stack SHALL support rollback to the previous deployment
3. WHEN rollback is triggered, THE CDK_Stack SHALL restore all Lambda functions to their previous versions
4. THE Rollback_Process SHALL restore all IAM permissions and environment variables
5. THE Rollback_Process SHALL complete within 5 minutes
