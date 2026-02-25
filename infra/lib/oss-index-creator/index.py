"""OpenSearch Serverless 벡터 인덱스 생성 Custom Resource Lambda."""

import json
import os
import urllib.request
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth


def handler(event, context):
    """CloudFormation Custom Resource 핸들러."""
    response_url = event.get("ResponseURL", "")
    request_type = event.get("RequestType", "")
    physical_id = event.get("PhysicalResourceId", "oss-index-creator")

    try:
        if request_type == "Create":
            create_index(event)
        # Update/Delete는 무시
        send_response(response_url, event, "SUCCESS", physical_id)
    except Exception as e:
        print(f"Error: {e}")
        send_response(response_url, event, "FAILED", physical_id, str(e))


def create_index(event):
    """OpenSearch Serverless에 벡터 인덱스를 생성한다."""
    props = event.get("ResourceProperties", {})
    endpoint = props.get("CollectionEndpoint", "")
    index_name = props.get("IndexName", "bedrock-knowledge-base-default-index")
    region = os.environ.get("AWS_REGION", "us-west-2")

    # SigV4 인증
    credentials = boto3.Session().get_credentials()
    awsauth = AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        region,
        "aoss",
        session_token=credentials.token,
    )

    # OpenSearch 클라이언트
    host = endpoint.replace("https://", "")
    client = OpenSearch(
        hosts=[{"host": host, "port": 443}],
        http_auth=awsauth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=30,
    )

    # 인덱스 존재 여부 확인
    if client.indices.exists(index=index_name):
        print(f"Index {index_name} already exists, skipping creation.")
        return

    # 벡터 인덱스 생성 (Bedrock KB 기본 스키마)
    index_body = {
        "settings": {
            "index.knn": True,
            "number_of_shards": 2,
            "number_of_replicas": 0,
        },
        "mappings": {
            "properties": {
                "bedrock-knowledge-base-default-vector": {
                    "type": "knn_vector",
                    "dimension": 1024,
                    "method": {
                        "engine": "faiss",
                        "name": "hnsw",
                        "parameters": {},
                    },
                },
                "AMAZON_BEDROCK_TEXT_CHUNK": {"type": "text"},
                "AMAZON_BEDROCK_METADATA": {"type": "text"},
            }
        },
    }

    client.indices.create(index=index_name, body=index_body)
    print(f"Index {index_name} created successfully.")


def send_response(url, event, status, physical_id, reason=""):
    """CloudFormation에 응답을 전송한다."""
    body = json.dumps({
        "Status": status,
        "Reason": reason or "See CloudWatch logs",
        "PhysicalResourceId": physical_id,
        "StackId": event.get("StackId", ""),
        "RequestId": event.get("RequestId", ""),
        "LogicalResourceId": event.get("LogicalResourceId", ""),
    }).encode("utf-8")

    req = urllib.request.Request(url, data=body, method="PUT")
    req.add_header("Content-Type", "application/json")
    req.add_header("Content-Length", str(len(body)))
    urllib.request.urlopen(req)
