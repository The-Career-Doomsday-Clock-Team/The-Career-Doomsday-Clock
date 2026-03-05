# Requirements Document

## Introduction

Career Doomsday Clock 애플리케이션의 UX 개선 기능 모음. 스킬 입력을 태그 기반으로 전환하고, 방명록에 스킬 표시 및 직업별 수명 랭킹 그래프를 추가하며, 결과 페이지에 PDF 다운로드 및 공유 기능을 제공한다.

## Glossary

- **TagInput**: 사용자가 텍스트를 입력하고 Enter 또는 쉼표로 개별 태그를 생성하는 UI 컴포넌트
- **Tag**: 개별 스킬을 나타내는 시각적 요소로, 텍스트와 삭제 버튼으로 구성
- **JobRiskRanking**: 모든 사용자의 직업별 평균 D-Day를 집계하여 시각화한 랭킹 차트
- **SurveySystem**: 설문 데이터를 수집하고 저장하는 백엔드 시스템
- **GuestbookSystem**: 방명록 데이터를 관리하는 백엔드 시스템
- **ResultSystem**: 분석 결과를 표시하고 내보내기를 지원하는 프론트엔드 시스템
- **RankingAPI**: 직업별 D-Day 통계를 집계하여 반환하는 백엔드 API

## Requirements

### Requirement 1: 태그 기반 스킬 입력

**User Story:** As a 사용자, I want 스킬을 태그 형태로 입력하고 관리, so that 여러 스킬을 직관적으로 추가하고 삭제할 수 있다.

#### Acceptance Criteria

1. WHEN a 사용자 types a skill name and presses Enter or comma, THE TagInput SHALL create a new tag and display the tag in the input area
2. WHEN a 사용자 clicks the delete button on a tag, THE TagInput SHALL remove that tag from the list
3. WHEN a 사용자 presses Backspace on an empty input field, THE TagInput SHALL remove the last tag from the list
4. WHEN a 사용자 attempts to add a duplicate skill tag, THE TagInput SHALL prevent the addition and maintain the current tag list
5. WHEN a 사용자 attempts to add a whitespace-only tag, THE TagInput SHALL prevent the addition and maintain the current tag list
6. WHEN the survey form is submitted, THE SurveySystem SHALL join all tags with commas and send the combined string to the backend API

### Requirement 2: 방명록 스킬 표시

**User Story:** As a 사용자, I want 방명록에서 다른 사용자의 보유 스킬을 확인, so that 다른 사용자의 배경을 파악할 수 있다.

#### Acceptance Criteria

1. WHEN a 방명록 entry is displayed, THE GuestbookSystem SHALL show the skills associated with that entry as tag-style badges
2. WHEN a 사용자 submits a guestbook entry, THE GuestbookSystem SHALL include the skills from the survey data in the entry
3. WHEN skills data is not available for an entry, THE GuestbookSystem SHALL display the entry without the skills section

### Requirement 3: 직업별 수명 랭킹 (Global Job Risk Ranking)

**User Story:** As a 사용자, I want 다른 사용자들의 직업별 AI 대체 수명을 랭킹 형태로 확인, so that 내 직업의 상대적 위험도를 파악할 수 있다.

#### Acceptance Criteria

1. WHEN a 사용자 visits the guestbook page, THE RankingAPI SHALL return aggregated job risk data including job title, average D-Day, and submission count
2. WHEN ranking data is displayed, THE GuestbookSystem SHALL render a horizontal bar chart sorted by average D-Day in ascending order (most at-risk first)
3. WHEN a job title has fewer than 2 submissions, THE RankingAPI SHALL exclude that job from the ranking to maintain statistical relevance
4. WHEN ranking data is loading, THE GuestbookSystem SHALL display a loading indicator in the chart area
5. WHEN ranking data fails to load, THE GuestbookSystem SHALL display the guestbook without the ranking section

### Requirement 4: 결과 PDF 다운로드

**User Story:** As a 사용자, I want 분석 결과를 PDF로 다운로드, so that 결과를 오프라인에서 보관하고 참고할 수 있다.

#### Acceptance Criteria

1. WHEN a 사용자 clicks the PDF download button, THE ResultSystem SHALL generate a PDF containing the D-Day value, skill risk analysis, and career cards
2. WHEN the PDF is generated, THE ResultSystem SHALL use the application's dystopia theme styling in the PDF layout
3. WHEN PDF generation is in progress, THE ResultSystem SHALL display a loading state on the download button

### Requirement 5: 결과 공유하기

**User Story:** As a 사용자, I want 분석 결과를 다른 사람에게 공유, so that 친구나 동료와 결과를 비교할 수 있다.

#### Acceptance Criteria

1. WHEN a 사용자 clicks the share button, THE ResultSystem SHALL copy a shareable summary text to the clipboard
2. WHEN the text is copied successfully, THE ResultSystem SHALL display a confirmation message for 2 seconds
3. WHEN the clipboard API is not available, THE ResultSystem SHALL display a fallback message with the shareable text
