# Implementation Plan: Lambda Layer 리팩토링

## Overview

현재 모든 Lambda 함수가 공유하는 단일 코드 베이스를 Lambda Layer와 개별 함수 디렉토리로 분리합니다. 이를 통해 CDK의 변경 감지를 개선하고, 개별 함수만 선택적으로 재배포할 수 있도록 합니다.

## Tasks

- [x] 1. Lambda Layer 디렉토리 구조 생성
  - `lambda/layers/common/python/` 디렉토리 생성
  - `utils/`, `models/`, `services/` 서브디렉토리 생성
  - 각 디렉토리에 `__init__.py` 파일 생성
  - _Requirements: 1.2, 6.1, 6.2, 6.3, 6.4_

- [x] 2. 공통 코드를 Layer로 이동
  - [x] 2.1 utils 모듈 이동
    - `lambda/utils/logging.py` → `lambda/layers/common/python/utils/logging.py`
    - `lambda/utils/response.py` → `lambda/layers/common/python/utils/response.py`
    - 모듈 인터페이스와 함수 시그니처 유지
    - _Requirements: 6.2, 6.5_
  
  - [x] 2.2 models 모듈 이동
    - `lambda/models/schemas.py` → `lambda/layers/common/python/models/schemas.py`
    - 모든 Pydantic 모델 클래스 유지
    - _Requirements: 6.3, 6.5_
  
  - [x] 2.3 services 모듈 이동
    - `lambda/services/validation.py` → `lambda/layers/common/python/services/validation.py`
    - validation 로직과 예외 클래스 유지
    - _Requirements: 6.4, 6.5_

- [x] 3. 함수별 독립 디렉토리 생성
  - `lambda/functions/` 디렉토리 생성
  - 각 함수별 서브디렉토리 생성: `survey/`, `analyze/`, `result/`, `guestbook_post/`, `guestbook_get/`, `reaction/`
  - 각 디렉토리에 빈 `requirements.txt` 파일 생성
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 4. 핸들러 코드 마이그레이션
  - [x] 4.1 Survey 핸들러 마이그레이션
    - `lambda/handlers/survey_handler.py` → `lambda/functions/survey/handler.py`
    - Import 문은 그대로 유지 (Layer가 자동으로 Python path에 추가됨)
    - 비즈니스 로직과 에러 처리 유지
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 4.2 Analyze 핸들러 마이그레이션
    - `lambda/handlers/analyze_handler.py` → `lambda/functions/analyze/handler.py`
    - Import 문은 그대로 유지
    - Bedrock Agent 호출 로직 유지
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 4.3 Result 핸들러 마이그레이션
    - `lambda/handlers/result_handler.py` → `lambda/functions/result/handler.py`
    - Import 문은 그대로 유지
    - DynamoDB 조회 로직 유지
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 4.4 Guestbook Post 핸들러 마이그레이션
    - `lambda/handlers/guestbook_post_handler.py` → `lambda/functions/guestbook_post/handler.py`
    - Import 문은 그대로 유지
    - 방명록 등록 로직 유지
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 4.5 Guestbook Get 핸들러 마이그레이션
    - `lambda/handlers/guestbook_get_handler.py` → `lambda/functions/guestbook_get/handler.py`
    - Import 문은 그대로 유지
    - 페이지네이션 로직 유지
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 4.6 Reaction 핸들러 마이그레이션
    - `lambda/handlers/reaction_handler.py` → `lambda/functions/reaction/handler.py`
    - Import 문은 그대로 유지
    - 이모지 반응 로직 유지
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Checkpoint - 파일 구조 검증
  - 모든 파일이 올바른 위치에 있는지 확인
  - 사용자에게 진행 상황 보고 및 질문 확인

- [x] 6. CDK Stack 수정 - Lambda Layer 정의
  - `infra/lib/api-stack.ts`에 Lambda Layer 정의 추가
  - `lambda.LayerVersion` 생성: `code: lambda.Code.fromAsset("../lambda/layers/common")`
  - `compatibleRuntimes: [lambda.Runtime.PYTHON_3_12]` 설정
  - `description` 및 `removalPolicy` 설정
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1_

- [x] 7. CDK Stack 수정 - Lambda 함수 정의 업데이트
  - [x] 7.1 Survey 함수 업데이트
    - `code: lambda.Code.fromAsset("../lambda/functions/survey")` 변경
    - `handler: "handler.handler"` 설정
    - `layers: [commonLayer]` 추가
    - 기존 환경 변수와 IAM 권한 유지
    - _Requirements: 2.4, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 7.2 Analyze 함수 업데이트
    - `code: lambda.Code.fromAsset("../lambda/functions/analyze")` 변경
    - `handler: "handler.handler"` 설정
    - `layers: [commonLayer]` 추가
    - 기존 환경 변수와 IAM 권한 유지
    - _Requirements: 2.4, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 7.3 Result 함수 업데이트
    - `code: lambda.Code.fromAsset("../lambda/functions/result")` 변경
    - `handler: "handler.handler"` 설정
    - `layers: [commonLayer]` 추가
    - 기존 환경 변수와 IAM 권한 유지
    - _Requirements: 2.4, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 7.4 Guestbook Post 함수 업데이트
    - `code: lambda.Code.fromAsset("../lambda/functions/guestbook_post")` 변경
    - `handler: "handler.handler"` 설정
    - `layers: [commonLayer]` 추가
    - 기존 환경 변수와 IAM 권한 유지
    - _Requirements: 2.4, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 7.5 Guestbook Get 함수 업데이트
    - `code: lambda.Code.fromAsset("../lambda/functions/guestbook_get")` 변경
    - `handler: "handler.handler"` 설정
    - `layers: [commonLayer]` 추가
    - 기존 환경 변수와 IAM 권한 유지
    - _Requirements: 2.4, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 7.6 Reaction 함수 업데이트
    - `code: lambda.Code.fromAsset("../lambda/functions/reaction")` 변경
    - `handler: "handler.handler"` 설정
    - `layers: [commonLayer]` 추가
    - 기존 환경 변수와 IAM 권한 유지
    - _Requirements: 2.4, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 7.7 API Gateway 엔드포인트 연결 유지
    - 모든 API Gateway 엔드포인트가 새 함수 정의를 참조하도록 확인
    - CORS 설정 유지
    - _Requirements: 3.6_

- [ ] 8. 테스트 설정 업데이트
  - `lambda/tests/conftest.py` 생성 또는 수정
  - Layer 경로를 Python path에 추가: `sys.path.insert(0, "lambda/layers/common/python")`
  - pytest 설정 업데이트
  - _Requirements: 8.1, 8.2, 8.4_

- [ ]* 9. 구조 검증 테스트 작성
  - `lambda/tests/test_structure.py` 생성
  - Layer 디렉토리 구조 존재 확인 테스트
  - 함수 디렉토리 존재 확인 테스트
  - Layer 모듈 파일 존재 확인 테스트
  - _Requirements: 8.1, 8.2_

- [ ]* 10. 기존 테스트 실행 및 검증
  - `pytest lambda/tests/` 실행
  - 모든 기존 테스트가 통과하는지 확인
  - 실패 시 import 경로 또는 테스트 설정 수정
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 11. Checkpoint - CDK Synthesis 검증
  - `cd infra && cdk synth` 실행
  - CloudFormation 템플릿이 정상 생성되는지 확인
  - Layer와 모든 함수가 템플릿에 포함되었는지 확인
  - 사용자에게 진행 상황 보고 및 질문 확인

- [ ]* 12. CDK 통합 테스트 작성
  - `infra/test/api-stack.test.ts` 업데이트
  - Lambda Layer 생성 확인 테스트
  - 모든 함수에 Layer 연결 확인 테스트
  - 함수별 개별 코드 경로 사용 확인 테스트
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 13. 변경 감지 테스트 스크립트 작성
  - `infra/scripts/test-change-detection.sh` 생성
  - 개별 함수 수정 시 해당 함수만 변경 감지되는지 테스트
  - Layer 수정 시 Layer 변경 감지되는지 테스트
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 14. 배포 전 최종 검증
  - [x] 14.1 CDK Diff 실행
    - `cd infra && cdk diff` 실행
    - 예상되는 변경사항 확인 (Layer 추가, 함수 코드 경로 변경)
    - 예상치 못한 변경사항이 있는지 확인
    - _Requirements: 7.1, 7.2_
  
  - [x] 14.2 배포 계획 검토
    - Layer가 먼저 배포되는지 확인
    - 모든 함수가 새 Layer를 참조하는지 확인
    - 롤백 계획 준비
    - _Requirements: 7.2, 7.3, 9.1, 9.2_

- [x] 15. 배포 실행
  - `cd infra && cdk deploy CareerDoomsdayApiStack` 실행
  - 배포 진행 상황 모니터링
  - 에러 발생 시 CloudFormation 자동 롤백 확인
  - _Requirements: 7.2, 7.3, 7.5_

- [x] 16. 배포 후 검증
  - [x] 16.1 CloudWatch Logs 확인
    - 각 Lambda 함수의 로그 확인
    - ImportError 또는 초기화 에러가 없는지 확인
    - _Requirements: 1.5, 2.4_
  
  - [x] 16.2 API 엔드포인트 테스트
    - 각 API 엔드포인트에 테스트 요청 전송
    - 응답이 정상인지 확인
    - _Requirements: 5.3, 8.1_
  
  - [x] 16.3 변경 감지 검증
    - 특정 함수 코드 수정 후 `cdk diff` 실행
    - 해당 함수만 변경 감지되는지 확인
    - _Requirements: 4.1, 4.4, 4.5_

- [ ] 17. 최종 Checkpoint
  - 모든 테스트가 통과했는지 확인
  - 배포가 성공했는지 확인
  - 사용자에게 최종 결과 보고

- [x] 18. 정리 작업
  - 원본 `lambda/handlers/` 디렉토리 백업 또는 제거 (사용자 확인 후)
  - 원본 `lambda/utils/`, `lambda/models/`, `lambda/services/` 디렉토리 백업 또는 제거 (사용자 확인 후)
  - Git 커밋 및 태그 생성
  - _Requirements: 9.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster implementation
- 원본 파일은 배포 검증 완료 전까지 보존됩니다 (Requirement 9.1)
- 배포 실패 시 CloudFormation이 자동으로 롤백합니다 (Requirement 9.2, 9.3)
- Layer는 immutable하므로 내용 변경 시 새 버전이 자동 생성됩니다
- 각 함수의 `requirements.txt`는 함수별 추가 의존성이 필요한 경우에만 사용됩니다
- 공통 의존성은 Layer의 `requirements.txt`에 포함됩니다
