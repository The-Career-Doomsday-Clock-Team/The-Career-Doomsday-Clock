# Implementation Plan

- [x] 1. 프로젝트 초기 설정




  - [x] 1.1 Next.js 프로젝트 생성 및 기본 설정


    - `npx create-next-app@latest frontend --typescript --app --tailwind`
    - Orbitron, JetBrains Mono 폰트 설정 (`next/font/google`)
    - 글로벌 CSS에 디자인 토큰 정의 (cyan: #00f0ff, magenta: #ff00ff, yellow: #ffff00, bg: #0a0a0a)
    - 네온 글로우 유틸리티 CSS 클래스 정의
    - _Requirements: 1.1, 6.4_
  - [x] 1.2 CDK 프로젝트 초기화 및 기본 스택 구조 설정


    - `npx cdk init app --language typescript` (infra 디렉토리)
    - 스택 분리: `StorageStack` (DynamoDB, S3), `ApiStack` (API Gateway, Lambda)
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 1.3 Python Lambda 프로젝트 구조 설정

    - `lambda/` 디렉토리에 handlers, services, models, utils 구조 생성
    - `requirements.txt`에 pydantic, boto3 추가
    - 공통 유틸리티: `response()` 헬퍼, 로깅 설정
    - _Requirements: 3.1, 10.4_

- [x] 2. CDK 인프라 — 스토리지 스택





  - [x] 2.1 DynamoDB 테이블 4개 정의 (survey, skill_graph, career_cards, guestbook)


    - PAY_PER_REQUEST 빌링 모드
    - guestbook 테이블에 GSI (created_at-index) 추가
    - 각 테이블의 PK/SK 설정 (디자인 문서 스키마 참조)
    - _Requirements: 9.1_
  - [x] 2.2 S3 버킷 정의 (Knowledge Base 원본 파일 저장용)


    - 퍼블릭 액세스 완전 차단 (`blockPublicAccess: BlockPublicAccess.BLOCK_ALL`)
    - 서버 측 암호화 활성화
    - CDK 배포 시 `pdfdata/` 폴더의 PDF 파일들(`Future_of_Jobs_Report_2025.pdf`, `WEF_Future_of_Jobs_Report_2025(Skill outlook).pdf`)을 S3 버킷에 업로드하는 `BucketDeployment` 설정
    - _Requirements: 9.3, 10.3_
  - [ ]* 2.3 CDK 스토리지 스택 단위 테스트
    - DynamoDB 테이블 4개 리소스 존재 확인
    - S3 퍼블릭 액세스 차단 설정 확인
    - _Requirements: 9.1, 9.3_

- [x] 3. Python 데이터 모델 및 유효성 검증






  - [x] 3.1 Pydantic 데이터 모델 구현

    - SurveyRequest, SkillRisk, RoadmapStep, CareerCard, AnalysisResult, GuestbookEntry, GuestbookRequest, ReactionRequest 모델 정의
    - 필드 제약 조건 적용 (min_length, ge, le 등)
    - _Requirements: 2.2, 3.5, 3.6, 8.5_
  - [x] 3.2 설문 유효성 검증 함수 구현


    - `validate_survey(data: dict) -> SurveyRequest` 함수
    - 필수 항목(name, job_title, strengths, hobbies) 검증
    - 공백만으로 구성된 입력 거부
    - _Requirements: 2.2, 2.3, 10.4_
  - [ ]* 3.3 Property 테스트: 세션 ID UUID v4 형식 준수
    - **Property 1: 세션 ID UUID v4 형식 준수**
    - **Validates: Requirements 1.4**
  - [ ]* 3.4 Property 테스트: 설문 유효성 검증 — 필수 항목 존재 시 통과
    - **Property 2: 설문 유효성 검증 — 필수 항목 존재 시 통과**
    - **Validates: Requirements 2.2**
  - [ ]* 3.5 Property 테스트: 설문 유효성 검증 — 필수 항목 누락 시 실패
    - **Property 3: 설문 유효성 검증 — 필수 항목 누락 시 실패**
    - **Validates: Requirements 2.2, 2.3**
  - [ ]* 3.6 Property 테스트: 데이터 모델 JSON 직렬화 라운드트립
    - **Property 4: 데이터 모델 JSON 직렬화 라운드트립**
    - **Validates: Requirements 3.5, 3.6, 8.5**

- [x] 4. Checkpoint









  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. CDK 인프라 — API 스택





  - [x] 5.1 Lambda 함수 6개 CDK 정의


    - survey_handler, analyze_handler, result_handler, guestbook_post_handler, guestbook_get_handler, reaction_handler
    - Python 3.12 런타임, 메모리/타임아웃 명시적 설정
    - analyze_handler 타임아웃 120초
    - 각 함수에 최소 권한 IAM (grantReadWriteData 등)
    - _Requirements: 9.2, 9.4, 10.1_
  - [x] 5.2 API Gateway REST API 정의


    - 5개 엔드포인트 라우팅 (POST /survey, GET /result/{sid}, POST /guestbook, GET /guestbook, POST /guestbook/{id}/reaction)
    - CORS 설정 (allowOrigins, allowMethods, allowHeaders)
    - 요청 속도 제한 (rate limiting) 설정
    - _Requirements: 9.2, 9.5, 10.5_
  - [ ]* 5.3 CDK API 스택 단위 테스트
    - Lambda 함수 6개 리소스 존재 확인
    - API Gateway 엔드포인트 확인
    - CORS 설정 확인
    - _Requirements: 9.2, 9.5_

- [x] 6. 백엔드 Lambda — 설문 저장 및 분석





  - [x] 6.1 survey_handler Lambda 구현


    - POST /survey 요청 파싱 및 Pydantic 유효성 검증
    - DynamoDB survey 테이블에 저장 (status: "analyzing")
    - analyze_handler 비동기 호출 (Lambda invoke async)
    - _Requirements: 3.1, 10.4_
  - [x] 6.2 analyze_handler Lambda 구현


    - Bedrock Agent 호출 (Claude 4.5 Sonnet)
    - Knowledge Base 검색 (`pdfdata/Future_of_Jobs_Report_2025.pdf` + `WEF_Future_of_Jobs_Report_2025(Skill outlook).pdf` 기반) + Web Search Action Group 활용
    - 스킬별 위험도 분석 결과를 skill_graph 테이블에 저장
    - 커리어 카드 3개를 career_cards 테이블에 저장
    - survey 테이블 status를 "completed"로 업데이트
    - 에러 시 status를 "error"로 업데이트
    - _Requirements: 3.2, 3.3, 3.4_
  - [ ]* 6.3 Property 테스트: 잘못된 입력 거부 (survey API)
    - **Property 13: 잘못된 입력 거부**
    - **Validates: Requirements 8.4, 10.4**

- [x] 7. 백엔드 Lambda — 결과 조회





  - [x] 7.1 result_handler Lambda 구현


    - GET /result/{sid} 경로 파라미터에서 session_id 추출
    - survey 테이블에서 status 확인
    - status가 "analyzing"이면 202 반환
    - status가 "completed"이면 skill_graph + career_cards 조회 후 200 반환
    - 세션 미발견 시 404 반환
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 7.2 Property 테스트: 결과 조회 저장-조회 라운드트립
    - **Property 8: 결과 조회 저장-조회 라운드트립**
    - **Validates: Requirements 7.1**
  - [ ]* 7.3 Property 테스트: 존재하지 않는 세션 ID 조회 시 404 반환
    - **Property 9: 존재하지 않는 세션 ID 조회 시 404 반환**
    - **Validates: Requirements 7.2**

- [x] 8. 백엔드 Lambda — 방명록





  - [x] 8.1 guestbook_post_handler Lambda 구현


    - POST /guestbook 요청 파싱 및 Pydantic 유효성 검증
    - 빈 메시지 / 공백만 메시지 거부
    - DynamoDB guestbook 테이블에 저장 (entry_id: UUID v4, created_at: ISO-8601)
    - _Requirements: 8.1, 8.4_
  - [x] 8.2 guestbook_get_handler Lambda 구현


    - GET /guestbook 쿼리 파라미터 (limit, last_key) 파싱
    - GSI (created_at-index) 사용하여 최신순 조회
    - 페이지네이션 (last_key 기반)
    - _Requirements: 8.2_
  - [x] 8.3 reaction_handler Lambda 구현


    - POST /guestbook/{id}/reaction 요청 파싱
    - DynamoDB ADD 연산으로 이모지 카운트 원자적 증가
    - 업데이트된 reactions 맵 반환
    - _Requirements: 8.3_
  - [ ]* 8.4 Property 테스트: 방명록 저장-조회 라운드트립
    - **Property 10: 방명록 저장-조회 라운드트립**
    - **Validates: Requirements 8.1**
  - [ ]* 8.5 Property 테스트: 방명록 최신순 정렬
    - **Property 11: 방명록 최신순 정렬**
    - **Validates: Requirements 8.2**
  - [ ]* 8.6 Property 테스트: 이모지 반응 카운트 정확성
    - **Property 12: 이모지 반응 카운트 정확성**
    - **Validates: Requirements 8.3**

- [x] 9. Checkpoint





  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. 프론트엔드 — 랜딩 페이지






  - [x] 10.1 LandingPage 컴포넌트 구현

    - 폐허 도시 + 네온사인 배경 (CSS gradient + box-shadow 네온 글로우)
    - "문을 열고 들어가기" 버튼 (네온 글로우 효과)
    - 클릭 시 /survey로 라우팅
    - UUID v4 세션 ID 생성 → sessionStorage 저장
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 11. 프론트엔드 — 설문 폼






  - [x] 11.1 SurveyForm 컴포넌트 구현

    - 단일 화면에 이름, 직업, 장점, 취미 4개 텍스트 입력 필드
    - 디스토피아 어조 질문 문구 (예: "당신의 정체를 밝혀라", "생존 기술을 입력하라")
    - 클라이언트 측 유효성 검증 (빈 필드 강조 표시)
    - 제출 시 POST /survey API 호출
    - _Requirements: 2.1, 2.2, 2.3, 3.1_

- [x] 12. 프론트엔드 — 로딩 및 결과 화면





  - [x] 12.1 LoadingScreen 컴포넌트 구현


    - 세계관 어조 로딩 메시지 ("당신의 운명을 계산 중...")
    - GET /result/{sid} 폴링 (2초 간격)
    - 분석 완료 시 결과 화면으로 자동 전환
    - 30초 타임아웃 시 추가 대기 안내 메시지
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 12.2 ResultPage 1단계 (디스토피아 선고) 구현


    - DoomsdayCounter: D-Day 카운트업 애니메이션 (페이드인 + 네온 글로우 펄스)
    - SkillRiskCard: 스킬별 위험도 카드 (확률%, 시간, 근거)
    - 2초 후 자동 전환 / 클릭 스킵
    - 구분선 슬라이드인 애니메이션
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 12.3 ResultPage 2단계 (유토피아 탈출) 구현


    - "당신을 위한 새로운 직업" 제목
    - CareerCard 3개 스태거 페이드인 (0ms/200ms/400ms)
    - 각 카드: 조합 공식, 추천 사유, 전환 로드맵
    - 네온 테두리: cyan/magenta/yellow 순서
    - 호버 시 글로우 강화
    - 유토피아 탈출 인터랙션 → 방명록으로 전환
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [ ]* 12.4 Property 테스트: 스킬 위험도 카드 렌더링 완전성
    - **Property 5: 스킬 위험도 카드 렌더링 완전성**
    - **Validates: Requirements 5.2**
  - [ ]* 12.5 Property 테스트: 커리어 카드 렌더링 완전성
    - **Property 6: 커리어 카드 렌더링 완전성**
    - **Validates: Requirements 6.3**
  - [ ]* 12.6 Property 테스트: 커리어 카드 네온 테두리 색상 순서
    - **Property 7: 커리어 카드 네온 테두리 색상 순서**
    - **Validates: Requirements 6.4**

- [x] 13. 프론트엔드 — 방명록






  - [x] 13.1 Guestbook 컴포넌트 구현

    - "이 폐허를 지나간 생존자들의 흔적" 헤더
    - 방명록 등록 폼 (직업명 + D-Day + 한마디)
    - 방명록 목록 (최신순, 무한 스크롤)
    - 이모지 반응 버튼 (😱💪🤖🔥 등)
    - API 연동: POST /guestbook, GET /guestbook, POST /guestbook/{id}/reaction
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
-

- [x] 14. API 클라이언트 통합




  - [x] 14.1 프론트엔드 API 클라이언트 구현


    - `lib/api.ts`에 모든 API 호출 함수 정의
    - 환경 변수 기반 API 엔드포인트 설정 (`NEXT_PUBLIC_API_URL`)
    - 에러 핸들링 및 재시도 로직
    - 세션 ID 자동 첨부
    - _Requirements: 3.1, 7.1, 8.1, 8.2, 8.3_

- [x] 15. Final Checkpoint





  - Ensure all tests pass, ask the user if questions arise.
