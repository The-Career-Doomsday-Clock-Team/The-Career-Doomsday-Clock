# Implementation Plan

- [x] 1. TagInput 컴포넌트 구현





  - [x] 1.1 TagInput UI 컴포넌트 생성


    - `frontend/src/components/ui/TagInput.tsx` 생성
    - Enter/쉼표 입력 시 태그 추가, X 버튼 클릭 시 삭제, Backspace 시 마지막 태그 삭제
    - 중복 방지 (대소문자 무시), 공백 태그 방지
    - 디스토피아 테마 스타일링 (네온 시안 태그 배지)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ]* 1.2 TagInput 속성 테스트 작성
    - fast-check 설치 및 TagInput 로직 속성 테스트
    - **Property 1: Adding a valid tag grows the tag list**
    - **Property 2: Removing a tag shrinks the tag list**
    - **Property 3: Backspace removes the last tag**
    - **Property 4: Invalid tags are rejected**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
  - [x] 1.3 설문 페이지에 TagInput 통합


    - `frontend/src/app/survey/page.tsx`에서 skills 입력을 TagInput으로 교체
    - 제출 시 태그 배열을 쉼표 구분 문자열로 변환하여 API 전송
    - _Requirements: 1.6_
  - [ ]* 1.4 태그 직렬화 속성 테스트
    - **Property 5: Tag list serialization round-trip**
    - **Validates: Requirements 1.6**

- [x] 2. 방명록 스킬 표시 및 랭킹 차트





  - [x] 2.1 방명록 백엔드에 skills 필드 추가


    - `lambda/functions/guestbook_post/handler.py`에서 skills 필드 저장
    - `lambda/models/schemas.py`의 GuestbookRequest에 skills 옵셔널 필드 추가
    - `frontend/src/types/guestbook.ts`에 skills 필드 추가
    - `frontend/src/lib/api.ts`의 postGuestbook에 skills 파라미터 추가
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 2.2 방명록 프론트엔드에 스킬 태그 표시


    - `frontend/src/app/guestbook/page.tsx`에서 각 항목에 스킬 태그 배지 렌더링
    - skills가 없는 항목은 스킬 섹션 생략
    - _Requirements: 2.1, 2.3_
  - [x] 2.3 Ranking API Lambda 생성


    - `lambda/functions/ranking/handler.py` 생성
    - survey 테이블 스캔 → status=completed 필터 → job_title별 평균 dday 집계
    - count < 2인 직업 제외, avg_dday 오름차순 정렬
    - _Requirements: 3.1, 3.3_
  - [ ]* 2.4 Ranking 집계 로직 속성 테스트
    - **Property 6: Ranking aggregation correctness**
    - **Property 7: Ranking sort order**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [x] 2.5 CDK에 Ranking API 리소스 추가


    - `infra/lib/api-stack.ts`에 ranking Lambda 함수 및 API Gateway 엔드포인트 추가
    - survey 테이블 읽기 권한 부여
    - _Requirements: 3.1_
  - [x] 2.6 JobRiskRanking 프론트엔드 컴포넌트 구현


    - `frontend/src/components/features/JobRiskRanking.tsx` 생성
    - CSS 기반 수평 바 차트, 디스토피아 테마
    - `frontend/src/lib/api.ts`에 fetchRanking API 함수 추가
    - 방명록 페이지에 랭킹 차트 통합
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 3. Checkpoint - 모든 테스트 통과 확인





  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 결과 PDF 다운로드 및 공유 기능





  - [x] 4.1 PDF 다운로드 기능 구현


    - html2canvas, jsPDF 패키지 설치
    - `frontend/src/lib/pdf.ts` 유틸리티 생성
    - 결과 페이지에 PDF 다운로드 버튼 추가
    - 로딩 상태 표시
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 4.2 공유하기 기능 구현


    - `frontend/src/lib/share.ts` 유틸리티 생성 (공유 텍스트 생성 + 클립보드 복사)
    - 결과 페이지에 공유 버튼 추가
    - 복사 성공 시 2초간 확인 메시지, Clipboard API 미지원 시 fallback
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 4.3 공유 텍스트 생성 속성 테스트
    - **Property 8: Share text contains all required fields**
    - **Validates: Requirements 5.1**

- [x] 5. 빌드 및 배포





  - [x] 5.1 프론트엔드 빌드 확인 및 CDK 배포



    - `npm run build` 성공 확인
    - `npx cdk deploy` 실행하여 백엔드 변경사항 배포
    - _Requirements: 전체_

- [x] 6. Final Checkpoint - 모든 테스트 통과 확인





  - Ensure all tests pass, ask the user if questions arise.
