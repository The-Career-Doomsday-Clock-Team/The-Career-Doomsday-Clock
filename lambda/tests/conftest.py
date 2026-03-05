"""Shared pytest fixtures for Lambda tests."""

import os
import sys
from pathlib import Path

# lambda/ 디렉토리를 기준으로 경로 설정
_lambda_root = Path(__file__).resolve().parent.parent
_layers_path = _lambda_root / "layers" / "common" / "python"

# sys.path에 lambda 루트와 공통 레이어 경로 추가
for p in [str(_lambda_root), str(_layers_path)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Ensure AWS SDK calls don't hit real AWS during tests
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SECURITY_TOKEN", "testing")
os.environ.setdefault("AWS_SESSION_TOKEN", "testing")
