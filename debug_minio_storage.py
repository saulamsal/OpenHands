#!/usr/bin/env python3
"""
Debug script to check MinIO/S3 storage contents.
"""

import os
import boto3
from botocore.exceptions import NoCredentialsError

# MinIO configuration from .env
MINIO_ENDPOINT = "https://minio.herd.test"
MINIO_ACCESS_KEY = "herd"
MINIO_SECRET_KEY = "secretkey"
MINIO_BUCKET = "qlurplatform"

def list_minio_contents():
    """List all objects in MinIO bucket to debug storage."""
    try:
        # Create S3 client for MinIO
        s3_client = boto3.client(
            's3',
            endpoint_url=MINIO_ENDPOINT,
            aws_access_key_id=MINIO_ACCESS_KEY,
            aws_secret_access_key=MINIO_SECRET_KEY,
            verify=False,  # Since AWS_S3_VERIFY_SSL=false in .env
        )
        
        print(f"Connecting to MinIO at {MINIO_ENDPOINT}")
        print(f"Bucket: {MINIO_BUCKET}\n")
        
        # List all objects in the bucket
        response = s3_client.list_objects_v2(Bucket=MINIO_BUCKET)
        
        if 'Contents' not in response:
            print("No objects found in the bucket!")
            return
        
        print(f"Found {len(response['Contents'])} objects:")
        print("-" * 80)
        
        for obj in response['Contents']:
            print(f"Key: {obj['Key']}")
            print(f"Size: {obj['Size']} bytes")
            print(f"Last Modified: {obj['LastModified']}")
            print("-" * 80)
            
        # Show folder structure
        print("\nFolder structure:")
        folders = set()
        for obj in response['Contents']:
            parts = obj['Key'].split('/')
            for i in range(1, len(parts)):
                folders.add('/'.join(parts[:i]))
        
        for folder in sorted(folders):
            print(f"  📁 {folder}/")
            
    except NoCredentialsError:
        print("Credentials not available")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    # Suppress SSL warnings since we're using verify=False
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    list_minio_contents()