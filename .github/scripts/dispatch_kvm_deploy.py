#!/usr/bin/env python3

"""Dispatch a signed deployment webhook from GitHub Actions to the KVM host.



The script intentionally uses only the Python standard library so it can run on

GitHub-hosted runners without extra dependency installation. It signs the exact

JSON request body with the shared secret and requires a successful JSON response

from the KVM listener before the workflow can mark the deployment healthy.

"""



from __future__ import annotations



import argparse

import hashlib

import hmac

import json

import sys

import time

import urllib.error

import urllib.request

from typing import Any





def build_parser() -> argparse.ArgumentParser:
  
    parser = argparse.ArgumentParser(description="Dispatch a signed KVM deployment webhook")
  
    parser.add_argument("--url", required=True, help="KVM webhook endpoint URL")
  
    parser.add_argument("--secret", required=True, help="Shared webhook HMAC secret")
  
    parser.add_argument("--timeout", type=int, default=900, help="HTTP timeout in seconds")
  
    parser.add_argument("--repository", required=True, help="GitHub repository, owner/name")
  
    parser.add_argument("--expected-repository", default="", help="Repository expected by KVM")
  
    parser.add_argument("--branch", required=True, help="Branch to deploy")
  
    parser.add_argument("--ref", required=True, help="Full Git ref")
  
    parser.add_argument("--sha", required=True, help="Commit SHA")
  
    parser.add_argument("--actor", required=True, help="GitHub actor")
  
    parser.add_argument("--run-id", required=True, help="GitHub Actions run ID")
  
    parser.add_argument("--run-attempt", required=True, help="GitHub Actions run attempt")
  
    parser.add_argument("--deployment-id", required=True, help="GitHub deployment ID")
  
    parser.add_argument("--health-url", default="", help="Health-check URL expected to pass after deployment")
  
    return parser
  




def canonical_json(data: dict[str, Any]) -> bytes:
  
    return json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")
  




def signature(secret: str, body: bytes) -> str:
  
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
  
    return f"sha256={digest}"
  




def post_json(url: str, body: bytes, secret: str, timeout: int) -> tuple[int, str, dict[str, Any] | None]:
  
    request = urllib.request.Request(
      
        url,
      
        data=body,
      
        method="POST",
      
        headers={
          
            "Content-Type": "application/json",
          
            "User-Agent": "podcity-github-actions-deployer/1.0",
          
            "X-GitHub-Event": "push",
          
            "X-GitHub-Delivery": f"podcity-{int(time.time())}",
          
            "X-Hub-Signature-256": signature(secret, body),
          
        },
      
    )
  
    try:
      
        with urllib.request.urlopen(request, timeout=timeout) as response:
          
            text = response.read().decode("utf-8", errors="replace")
          
            parsed = json.loads(text) if text.strip() else None
          
            return response.status, text, parsed
          
    except urllib.error.HTTPError as exc:
      
        text = exc.read().decode("utf-8", errors="replace")
      
        try:
          
            parsed = json.loads(text) if text.strip() else None
          
        except json.JSONDecodeError:
          
            parsed = None
          
        return exc.code, text, parsed
      




def main() -> int:
  
    args = build_parser().parse














































