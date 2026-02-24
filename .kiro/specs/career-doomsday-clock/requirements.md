# Requirements Document

## Introduction

Career Doomsday Clock은 인류 멸망한 디스토피아 세계관을 배경으로, 사용자의 직업 수명을 분석하고 새로운 커리어를 제안하는 인터랙티브 웹 서비스이다. 사용자는 폐허 도시의 네온사인 건물에 들어서 설문을 통해 자신의 직업 정보를 입력하고, AI 분석을 통해 직업 수명 선고(디스토피아)와 새로운 직업 제안(유토피아)을 경험한다. 방명록에 흔적을 남기고 탈출하는 것으로 여정이 마무리된다. 프론트엔드는 Next.js + AWS Amplify, 백엔드는 API Gateway + Lambda, AI는 Amazon Bedrock(Claude 3.5 Sonnet) + Knowledge Base + Agent를 사용하며, 인프라는 AWS CDK로 배포한다.

## Glossary

- **Career Doomsday Clock 시스템**: 사용자의 직업 수명을 분석하고 새로운 커리어를 제안하는 웹 애플리케이션 전체
- **설문 모듈**: 사용자로부터 이름, 직업, 장점, 취미 정보를 수집하는 프론트엔드 컴포넌트
- **분석 엔진**: Amazon Bedrock Agent를 활용하여 스킬별 위험도와 커리어 카드를 생성하는 백엔드 서비스
- **D-Day**: AI가 예측한 해당 직업의 남은 수명(년 단위)
- **커리어 카드**: [현재직업] + [장점] + [취미] = [새 직업명] 형태의 조합 공식과 추천 사유, 전환 로드맵을 포함하는 결과 카드
- **스킬 위험도 카드**: 개별 스킬의 AI 대체 확률(%), 시간 범위(년), 근거 텍스트를 표시하는 카드
- **방명록**: 익명 사용자가 결과를 한 줄로 공유하고 이모지 반응을 남길 수 있는 게시판
- **세션 ID**: UUID v4 기반의 익명 사용자 식별자로, 브라우저 sessionStorage에 저장
- **Knowledge Base**: `pdfdata/` 폴더의 PDF 파일들(`Future_of_Jobs_Report_2025.pdf`, `WEF_Future_of_Jobs_Report_2025(Skill outlook).pdf`)을 S3에 업로드한 후 청크 단위로 인덱싱한 Bedrock Knowledge Base
- **CDK 스택**: AWS CDK를 사용하여 정의된 인프라 리소스 묶음

## Requirements

### Requirement 1: 랜딩 페이지

**User Story:** 사용자로서, 폐허 도시 배경의 랜딩 페이지를 통해 서비스에 진입하고 싶다. 그래야 세계관에 몰입하며 서비스를 시작할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 랜딩 페이지에 접속하면, THE Career Doomsday Clock 시스템 SHALL 폐허 도시와 네온사인 배경을 포함한 랜딩 화면을 표시한다.
2. WHEN 사용자가 "문을 열고 들어가기" 버튼을 클릭하면, THE Career Doomsday Clock 시스템 SHALL 설문 입력 화면으로 전환한다.
3. THE Career Doomsday Clock 시스템 SHALL 로그인이나 회원가입 없이 익명으로 서비스를 이용할 수 있도록 한다.
4. WHEN 사용자가 최초 접속하면, THE Career Doomsday Clock 시스템 SHALL UUID v4 기반 세션 ID를 생성하여 브라우저 sessionStorage에 저장한다.

### Requirement 2: 설문 입력

**User Story:** 사용자로서, 디스토피아 어조의 설문을 통해 나의 정보를 입력하고 싶다. 그래야 AI가 나의 직업 수명을 정확히 분석할 수 있다.

#### Acceptance Criteria

1. WHEN 설문 화면이 표시되면, THE 설문 모듈 SHALL 디스토피아 세계관 어조로 작성된 질문 문구와 함께 이름, 직업, 장점, 취미 입력 필드를 하나의 화면에 동시에 표시한다.
2. WHEN 사용자가 설문을 제출하면, THE 설문 모듈 SHALL 모든 필수 항목(이름, 직업, 장점, 취미)이 입력되었는지 검증한다.
3. IF 필수 항목이 누락된 경우, THEN THE 설문 모듈 SHALL 해당 항목을 강조 표시하고 입력을 요청하는 메시지를 표시한다.

### Requirement 3: 설문 데이터 저장 및 분석 트리거

**User Story:** 시스템 운영자로서, 설문 응답을 저장하고 AI 분석을 자동으로 시작하고 싶다. 그래야 사용자에게 빠르게 결과를 제공할 수 있다.

#### Acceptance Criteria

1. WHEN 설문이 제출되면, THE Career Doomsday Clock 시스템 SHALL POST /survey API를 호출하여 설문 응답(이름, 직업, 장점, 취미)을 DynamoDB survey 테이블에 저장한다.
2. WHEN 설문 응답이 저장되면, THE 분석 엔진 SHALL Amazon Bedrock Agent를 호출하여 스킬별 위험도 분석과 커리어 카드 생성을 시작한다.
3. WHEN 분석 엔진이 Bedrock Agent를 호출하면, THE 분석 엔진 SHALL Knowledge Base(`pdfdata/Future_of_Jobs_Report_2025.pdf` 및 `pdfdata/WEF_Future_of_Jobs_Report_2025(Skill outlook).pdf` 기반)와 Web Search Action Group을 활용하여 분석 근거를 수집한다.
4. WHEN 분석이 완료되면, THE 분석 엔진 SHALL 스킬별 위험도 데이터를 skill_graph 테이블에, 커리어 카드 데이터를 career_cards 테이블에 저장한다.
5. WHEN 설문 데이터를 직렬화하면, THE Career Doomsday Clock 시스템 SHALL JSON 형식으로 인코딩하고, 역직렬화 시 원본 데이터와 동일한 구조를 복원한다.
6. WHEN 분석 결과를 직렬화하면, THE 분석 엔진 SHALL JSON 형식으로 인코딩하고, 역직렬화 시 원본 결과와 동일한 구조를 복원한다.

### Requirement 4: 분석 로딩 화면

**User Story:** 사용자로서, AI 분석이 진행되는 동안 세계관에 맞는 로딩 화면을 보고 싶다. 그래야 대기 시간에도 몰입감을 유지할 수 있다.

#### Acceptance Criteria

1. WHEN 설문 제출 후 분석이 진행 중이면, THE Career Doomsday Clock 시스템 SHALL "당신의 운명을 계산 중..." 등 세계관 어조의 로딩 메시지를 표시한다.
2. WHEN 분석이 완료되면, THE Career Doomsday Clock 시스템 SHALL 로딩 화면에서 결과 화면으로 자동 전환한다.
3. IF 분석이 30초 이내에 완료되지 않으면, THEN THE Career Doomsday Clock 시스템 SHALL 사용자에게 추가 대기 안내 메시지를 표시한다.

### Requirement 5: 결과 화면 — 1단계 선고 (디스토피아)

**User Story:** 사용자로서, 나의 직업 수명을 D-Day 카운트업 애니메이션과 스킬별 위험도 카드로 확인하고 싶다. 그래야 현재 직업의 위험도를 직관적으로 파악할 수 있다.

#### Acceptance Criteria

1. WHEN 결과 화면 1단계가 표시되면, THE Career Doomsday Clock 시스템 SHALL D-Day 값을 0부터 최종 값까지 카운트업하는 애니메이션을 페이드인과 네온 글로우 펄스 효과와 함께 재생한다.
2. WHEN D-Day 애니메이션이 완료되면, THE Career Doomsday Clock 시스템 SHALL 각 스킬의 대체 확률(%), 시간 범위(년), 세계관 어조 근거 텍스트를 포함한 위험도 카드를 표시한다.
3. WHEN 1단계 표시 후 2초가 경과하면, THE Career Doomsday Clock 시스템 SHALL 자동으로 2단계 화면으로 전환한다.
4. WHEN 사용자가 1단계 화면을 클릭하면, THE Career Doomsday Clock 시스템 SHALL 2초 대기를 건너뛰고 즉시 2단계 화면으로 전환한다.
5. WHEN 1단계에서 2단계로 전환되면, THE Career Doomsday Clock 시스템 SHALL 구분선 슬라이드인 애니메이션을 재생한다.

### Requirement 6: 결과 화면 — 2단계 탈출 (유토피아)

**User Story:** 사용자로서, 현재 직업과 취미를 조합한 새로운 직업 카드 3개를 확인하고 싶다. 그래야 미래 커리어 전환의 방향을 얻을 수 있다.

#### Acceptance Criteria

1. WHEN 2단계 화면이 표시되면, THE Career Doomsday Clock 시스템 SHALL "당신을 위한 새로운 직업" 제목을 표시한다.
2. WHEN 커리어 카드가 표시되면, THE Career Doomsday Clock 시스템 SHALL 3개의 카드를 0ms, 200ms, 400ms 간격으로 스태거 페이드인 애니메이션으로 표시한다.
3. WHEN 각 커리어 카드가 렌더링되면, THE Career Doomsday Clock 시스템 SHALL 조합 공식([현재직업] + [장점] + [취미] = [새 직업명]), 추천 사유, 전환 로드맵(단계별 기간 포함)을 포함한다.
4. WHEN 커리어 카드가 표시되면, THE Career Doomsday Clock 시스템 SHALL 각 카드에 cyan, magenta, yellow 순서로 네온 테두리를 적용한다.
5. WHEN 사용자가 커리어 카드에 마우스를 올리면, THE Career Doomsday Clock 시스템 SHALL 해당 카드의 네온 글로우 효과를 강화한다.
6. WHEN 사용자가 유토피아 탈출 인터랙션을 완료하면, THE Career Doomsday Clock 시스템 SHALL 방명록 화면으로 전환한다.

### Requirement 7: 결과 조회 API

**User Story:** 시스템 운영자로서, 세션 ID 기반으로 분석 결과를 조회할 수 있는 API를 제공하고 싶다. 그래야 프론트엔드가 결과 데이터를 가져올 수 있다.

#### Acceptance Criteria

1. WHEN 프론트엔드가 GET /result/{sid}를 호출하면, THE Career Doomsday Clock 시스템 SHALL 해당 세션의 스킬 위험도 데이터와 커리어 카드 데이터를 JSON 형식으로 반환한다.
2. IF 존재하지 않는 세션 ID로 조회하면, THEN THE Career Doomsday Clock 시스템 SHALL HTTP 404 상태 코드와 오류 메시지를 반환한다.
3. IF 분석이 아직 진행 중이면, THEN THE Career Doomsday Clock 시스템 SHALL HTTP 202 상태 코드와 진행 중 상태를 반환한다.

### Requirement 8: 방명록

**User Story:** 사용자로서, 나의 결과를 익명으로 한 줄 공유하고 다른 사람의 결과에 이모지 반응을 남기고 싶다. 그래야 다른 생존자들과 경험을 나눌 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 방명록에 글을 등록하면, THE Career Doomsday Clock 시스템 SHALL POST /guestbook API를 호출하여 직업명, D-Day 값, 한마디 메시지를 저장한다.
2. WHEN 방명록 목록을 조회하면, THE Career Doomsday Clock 시스템 SHALL GET /guestbook API를 호출하여 최신순으로 정렬된 항목을 페이지네이션하여 반환한다.
3. WHEN 사용자가 방명록 항목에 이모지 반응을 추가하면, THE Career Doomsday Clock 시스템 SHALL POST /guestbook/{id}/reaction API를 호출하여 DynamoDB ADD 연산으로 반응 카운트를 원자적으로 증가시킨다.
4. IF 방명록 메시지가 빈 문자열이면, THEN THE Career Doomsday Clock 시스템 SHALL 등록을 거부하고 입력 요청 메시지를 표시한다.
5. WHEN 방명록 항목을 직렬화하면, THE Career Doomsday Clock 시스템 SHALL JSON 형식으로 인코딩하고, 역직렬화 시 원본 항목과 동일한 구조를 복원한다.

### Requirement 9: AWS 인프라 (CDK)

**User Story:** 개발자로서, 모든 AWS 리소스를 CDK로 정의하고 배포하고 싶다. 그래야 인프라를 코드로 관리하고 재현 가능한 배포를 할 수 있다.

#### Acceptance Criteria

1. THE Career Doomsday Clock 시스템 SHALL DynamoDB 테이블(survey, skill_graph, career_cards, guestbook)을 CDK 스택으로 정의한다.
2. THE Career Doomsday Clock 시스템 SHALL API Gateway REST API와 Lambda 함수들을 CDK 스택으로 정의한다.
3. THE Career Doomsday Clock 시스템 SHALL S3 버킷(`pdfdata/` 폴더의 PDF 파일들 저장용)을 퍼블릭 액세스 차단 설정과 함께 CDK 스택으로 정의한다.
4. THE Career Doomsday Clock 시스템 SHALL 각 Lambda 함수에 최소 권한 IAM 정책을 CDK에서 부여한다.
5. THE Career Doomsday Clock 시스템 SHALL API Gateway에 CORS 설정을 CDK에서 구성한다.

### Requirement 10: 보안

**User Story:** 시스템 운영자로서, 서비스의 보안을 확보하고 싶다. 그래야 사용자 데이터를 안전하게 보호할 수 있다.

#### Acceptance Criteria

1. THE Career Doomsday Clock 시스템 SHALL 모든 Lambda 함수에 IAM 최소 권한 원칙을 적용한다.
2. THE Career Doomsday Clock 시스템 SHALL 익명 세션 ID 기반으로 운영하여 PII(개인식별정보) 수집을 최소화한다.
3. THE Career Doomsday Clock 시스템 SHALL S3 버킷의 퍼블릭 액세스를 완전히 차단한다.
4. THE Career Doomsday Clock 시스템 SHALL 모든 API 요청에 대해 서버 측 입력 검증을 수행한다.
5. THE Career Doomsday Clock 시스템 SHALL API Gateway에서 요청 속도 제한(rate limiting)을 적용한다.
