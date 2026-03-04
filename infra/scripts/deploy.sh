#!/bin/bash

# Career Doomsday Clock CDK 배포 스크립트
# 의존성 순서: Storage → Bedrock → Api → Frontend

set -e  # 에러 발생 시 중단

# UTF-8 인코딩 설정 (WSL 호환)
export LANG=ko_KR.UTF-8
export LC_ALL=ko_KR.UTF-8

# 색상 정의 (WSL 호환)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# 기본값
AWS_PROFILE=""
AWS_REGION=""

# 스택 정의 (의존성 순서대로)
declare -a STACKS=(
    "CareerDoomsdayStorageStack"
    "CareerDoomsdayBedrockStack"
    "CareerDoomsdayApiStack"
    "CareerDoomsdayFrontendStack"
)

# 스택 의존성 확인 함수
get_dependency() {
    local stack=$1
    case "$stack" in
        "CareerDoomsdayStorageStack")
            echo ""
            ;;
        "CareerDoomsdayBedrockStack")
            echo "CareerDoomsdayStorageStack"
            ;;
        "CareerDoomsdayApiStack")
            echo "CareerDoomsdayBedrockStack"
            ;;
        "CareerDoomsdayFrontendStack")
            echo "CareerDoomsdayApiStack"
            ;;
    esac
}

# 사용법 출력
usage() {
    printf "${BLUE}사용법: $0 [스택이름] [옵션]${NC}\n"
    printf "\n"
    printf "스택 이름 (선택사항):\n"
    printf "  Storage   - DynamoDB 테이블 및 S3 버킷\n"
    printf "  Bedrock   - Bedrock Knowledge Base 및 Agent\n"
    printf "  Api       - Lambda 함수 및 API Gateway\n"
    printf "  Frontend  - Amplify 프론트엔드\n"
    printf "  (생략)    - 전체 스택 배포\n"
    printf "\n"
    printf "옵션:\n"
    printf "  --profile <name>   AWS 프로파일 지정\n"
    printf "  --region <region>  AWS 리전 지정\n"
    printf "\n"
    printf "예시:\n"
    printf "  $0                                    # 전체 배포\n"
    printf "  $0 Storage                            # Storage 스택만 배포\n"
    printf "  $0 Bedrock --profile test --region us-west-2\n"
    exit 1
}

# CDK 디렉토리로 이동
cd "$(dirname "$0")/.." || exit 1

# CDK 명령어 빌드 헬퍼
build_cdk_command() {
    local cmd=""
    
    # 환경 변수로 리전 설정 (프로파일 기본값보다 우선)
    if [ -n "$AWS_REGION" ]; then
        cmd="AWS_REGION=$AWS_REGION CDK_DEFAULT_REGION=$AWS_REGION "
    fi
    
    if [ -n "$AWS_PROFILE" ]; then
        cmd="${cmd}AWS_PROFILE=$AWS_PROFILE "
    fi
    
    cmd="${cmd}npx cdk $1"
    
    if [ -n "$AWS_PROFILE" ]; then
        cmd="$cmd --profile $AWS_PROFILE"
    fi
    
    if [ -n "$AWS_REGION" ]; then
        cmd="$cmd --region $AWS_REGION"
    fi
    
    echo "$cmd"
}

# synth 실행
run_synth() {
    printf "${BLUE}=== CDK Synth 실행 ===${NC}\n"
    local cmd=$(build_cdk_command "synth")
    if eval "$cmd > /dev/null 2>&1"; then
        printf "${GREEN}✓ Synth 성공${NC}\n\n"
        return 0
    else
        printf "${RED}✗ Synth 실패 - CloudFormation 템플릿 생성 중 오류 발생${NC}\n"
        return 1
    fi
}

# diff 실행
run_diff() {
    local stack=$1
    printf "${BLUE}=== [$stack] 변경사항 확인 ===${NC}\n"
    
    local cmd=$(build_cdk_command "diff $stack")
    eval "$cmd 2>&1 | tee /tmp/cdk-diff-output.txt"
    
    # diff 결과 확인
    if grep -q "There were no differences" /tmp/cdk-diff-output.txt; then
        printf "${GREEN}✓ 변경사항 없음${NC}\n\n"
        return 2  # 변경사항 없음
    else
        printf "${YELLOW}! 변경사항 발견${NC}\n\n"
        return 0  # 변경사항 있음
    fi
}

# 배포 확인
confirm_deploy() {
    local stack=$1
    printf "${YELLOW}[$stack] 배포를 진행하시겠습니까? (y/n)${NC} "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        printf "${RED}배포 취소${NC}\n"
        return 1
    fi
    return 0
}

# 스택 배포
deploy_stack() {
    local stack=$1
    
    printf "${GREEN}=== [$stack] 배포 시작 ===${NC}\n"
    
    local cmd=$(build_cdk_command "deploy $stack --require-approval never")
    if eval "$cmd"; then
        printf "${GREEN}✓ [$stack] 배포 완료${NC}\n\n"
        return 0
    else
        printf "${RED}✗ [$stack] 배포 실패${NC}\n"
        return 1
    fi
}

# 의존성 스택 확인 및 배포
check_and_deploy_dependencies() {
    local target_stack=$1
    local dependency=$(get_dependency "$target_stack")
    
    if [ -n "$dependency" ]; then
        printf "${BLUE}=== 의존성 확인: $dependency ===${NC}\n\n"
        
        # 의존성 스택의 diff 확인
        run_diff "$dependency"
        local diff_result=$?
        
        if [ $diff_result -eq 0 ]; then
            # 변경사항이 있으면 배포 필요
            printf "${YELLOW}의존성 스택 [$dependency]에 변경사항이 있습니다.${NC}\n"
            if confirm_deploy "$dependency"; then
                # 의존성의 의존성도 재귀적으로 확인
                check_and_deploy_dependencies "$dependency" || return 1
                deploy_stack "$dependency" || return 1
            else
                return 1
            fi
        elif [ $diff_result -eq 2 ]; then
            # 변경사항 없음
            printf "${GREEN}의존성 스택 [$dependency]은 최신 상태입니다.${NC}\n\n"
        fi
    fi
    
    return 0
}

# 단일 스택 배포
deploy_single() {
    local stack_key=$1
    local stack_name="CareerDoomsday${stack_key}Stack"
    
    # 스택 존재 확인
    local stack_exists=false
    for stack in "${STACKS[@]}"; do
        if [ "$stack" == "$stack_name" ]; then
            stack_exists=true
            break
        fi
    done
    
    if [ "$stack_exists" == false ]; then
        printf "${RED}✗ 알 수 없는 스택: $stack_key${NC}\n"
        usage
    fi
    
    printf "${BLUE}========================================${NC}\n"
    printf "${BLUE}  Career Doomsday Clock CDK 배포${NC}\n"
    printf "${BLUE}  대상: %s${NC}\n" "$stack_name"
    printf "${BLUE}========================================${NC}\n\n"
    
    # 1. Synth 실행
    run_synth || exit 1
    
    # 2. 의존성 확인 및 배포
    check_and_deploy_dependencies "$stack_name" || exit 1
    
    # 3. 대상 스택 diff 확인
    run_diff "$stack_name"
    local diff_result=$?
    
    if [ $diff_result -eq 2 ]; then
        printf "${GREEN}[$stack_name]은 이미 최신 상태입니다. 배포가 필요하지 않습니다.${NC}\n"
        exit 0
    fi
    
    # 4. 배포 확인
    if ! confirm_deploy "$stack_name"; then
        exit 1
    fi
    
    # 5. 배포 실행
    deploy_stack "$stack_name" || exit 1
    
    printf "${GREEN}========================================${NC}\n"
    printf "${GREEN}  배포 완료!${NC}\n"
    printf "${GREEN}========================================${NC}\n"
}

# 전체 스택 배포
deploy_all() {
    printf "${BLUE}========================================${NC}\n"
    printf "${BLUE}  Career Doomsday Clock CDK 전체 배포${NC}\n"
    printf "${BLUE}========================================${NC}\n\n"
    
    # 1. Synth 실행
    run_synth || exit 1
    
    # 2. 모든 스택의 diff 확인
    printf "${BLUE}=== 전체 스택 변경사항 확인 ===${NC}\n\n"
    local has_changes=false
    
    for stack in "${STACKS[@]}"; do
        run_diff "$stack"
        local diff_result=$?
        if [ $diff_result -eq 0 ]; then
            has_changes=true
        fi
    done
    
    if [ "$has_changes" == false ]; then
        printf "${GREEN}모든 스택이 최신 상태입니다. 배포가 필요하지 않습니다.${NC}\n"
        exit 0
    fi
    
    # 3. 전체 배포 확인
    printf "${YELLOW}전체 스택을 배포하시겠습니까? (y/n)${NC} "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        printf "${RED}배포 취소${NC}\n"
        exit 1
    fi
    
    # 4. 의존성 순서대로 배포
    for stack in "${STACKS[@]}"; do
        deploy_stack "$stack" || exit 1
    done
    
    printf "${GREEN}========================================${NC}\n"
    printf "${GREEN}  전체 배포 완료!${NC}\n"
    printf "${GREEN}========================================${NC}\n"
}

# 메인 로직
STACK_NAME=""

# 인자 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        --profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        -h|--help|help)
            usage
            ;;
        Storage|storage|Bedrock|bedrock|Api|api|Frontend|frontend)
            STACK_NAME="$1"
            shift
            ;;
        *)
            printf "${RED}✗ 알 수 없는 옵션: $1${NC}\n\n"
            usage
            ;;
    esac
done

# 스택 이름이 없으면 전체 배포
if [ -z "$STACK_NAME" ]; then
    deploy_all
else
    # 스택 이름 정규화
    case "$STACK_NAME" in
        Storage|storage)
            deploy_single "Storage"
            ;;
        Bedrock|bedrock)
            deploy_single "Bedrock"
            ;;
        Api|api)
            deploy_single "Api"
            ;;
        Frontend|frontend)
            deploy_single "Frontend"
            ;;
    esac
fi
