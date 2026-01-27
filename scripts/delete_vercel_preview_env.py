#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "requests",
# ]
# ///
"""
Delete Vercel preview environment variable for a merged PR branch.

This script deletes the NEXT_PUBLIC_API_URL_{branch_name} environment variable
from the frontend project when a PR is merged.

Required environment variables:
- VERCEL_TOKEN: Your Vercel API token
- BRANCH_NAME: The branch being merged/closed
- FRONTEND_PROJECT_NAME: The Vercel project name for the frontend
"""

import os
import re
import sys

import requests

# Constants
VERCEL_API_BASE = "https://api.vercel.com"
ENV_VAR_PREFIX = "NEXT_PUBLIC_API_URL_"
MAX_ENV_VAR_LENGTH = 63
MAX_BRANCH_SUFFIX_LENGTH = MAX_ENV_VAR_LENGTH - len(ENV_VAR_PREFIX)  # 43 characters


def get_vercel_token() -> str:
    """Get the Vercel token from environment variables."""
    token = os.environ.get("VERCEL_TOKEN")
    if not token:
        print("Error: VERCEL_TOKEN environment variable is not set")
        print("Available environment variables:")
        for key in sorted(os.environ.keys()):
            if "TOKEN" in key or "VERCEL" in key or "BRANCH" in key:
                # Mask token values for security
                value = os.environ[key]
                if "TOKEN" in key and value:
                    value = value[:4] + "..." + value[-4:] if len(value) > 8 else "***"
                print(f"  {key}={value}")
        sys.exit(1)
    print(f"VERCEL_TOKEN found (length: {len(token)})")
    return token


def get_branch_name() -> str:
    """Get the branch name from environment variables."""
    branch = os.environ.get("BRANCH_NAME")
    if not branch:
        print("Error: BRANCH_NAME environment variable is not set")
        print("Available environment variables:")
        for key in sorted(os.environ.keys()):
            if "BRANCH" in key or "REF" in key or "GIT" in key:
                print(f"  {key}={os.environ[key]}")
        sys.exit(1)
    return branch


def get_frontend_project_name() -> str:
    """Get frontend project name from environment variables."""
    frontend = os.environ.get("FRONTEND_PROJECT_NAME")
    if not frontend:
        print("Error: FRONTEND_PROJECT_NAME environment variable is not set")
        sys.exit(1)
    return frontend


def sanitize_branch_name(branch: str) -> str:
    """
    Sanitize branch name for use in environment variable names.

    - Replace non-alphanumeric characters with underscores
    - Convert to uppercase
    - Truncate to fit within the max length
    """
    # Replace slashes and other special characters with underscores
    sanitized = re.sub(r"[^a-zA-Z0-9]", "_", branch)
    # Convert to uppercase
    sanitized = sanitized.upper()
    # Truncate to fit within max length
    sanitized = sanitized[:MAX_BRANCH_SUFFIX_LENGTH]
    return sanitized


def get_env_var_name(branch: str) -> str:
    """Get the full environment variable name for a branch."""
    return f"{ENV_VAR_PREFIX}{sanitize_branch_name(branch)}"


def make_vercel_request(
    method: str,
    endpoint: str,
    token: str,
    params: dict | None = None,
    json_data: dict | None = None,
) -> requests.Response:
    """Make a request to the Vercel API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    url = f"{VERCEL_API_BASE}{endpoint}"

    print(f"  API Request: {method} {endpoint}")
    if params:
        print(f"  Params: {params}")

    response = requests.request(
        method=method,
        url=url,
        headers=headers,
        params=params,
        json=json_data,
        timeout=30,
    )

    print(f"  Response status: {response.status_code}")

    return response


def get_project_id(token: str, project_name: str) -> str:
    """Get the project ID for a Vercel project by name."""
    print(f"Fetching project ID for '{project_name}'...")

    response = make_vercel_request(
        method="GET",
        endpoint=f"/v9/projects/{project_name}",
        token=token,
    )

    if response.status_code != 200:
        print(f"Error fetching project '{project_name}': {response.status_code}")
        print(f"Response: {response.text}")
        sys.exit(1)

    project_data = response.json()
    project_id = project_data.get("id")

    if not project_id:
        print("Error: Could not find project ID in response")
        print(f"Response data: {project_data}")
        sys.exit(1)

    print(f"Found project ID for '{project_name}': {project_id}")
    return project_id


def get_env_var_id(token: str, project_id: str, env_var_name: str) -> str | None:
    """Get the ID of an environment variable by name."""
    print(f"Looking for env var '{env_var_name}'...")

    response = make_vercel_request(
        method="GET",
        endpoint=f"/v10/projects/{project_id}/env",
        token=token,
    )

    if response.status_code != 200:
        print(f"Error fetching env vars: {response.status_code}")
        print(f"Response: {response.text}")
        return None

    env_vars = response.json().get("envs", [])
    print(f"Found {len(env_vars)} environment variables on project")

    for env_var in env_vars:
        if env_var.get("key") == env_var_name:
            print(f"Found env var '{env_var_name}' with ID: {env_var.get('id')}")
            return env_var.get("id")

    print(f"Env var '{env_var_name}' not found")
    return None


def delete_env_var(token: str, project_id: str, env_var_id: str) -> bool:
    """Delete an environment variable by ID."""
    print(f"Deleting env var with ID '{env_var_id}'...")

    response = make_vercel_request(
        method="DELETE",
        endpoint=f"/v10/projects/{project_id}/env/{env_var_id}",
        token=token,
    )

    if response.status_code not in [200, 204]:
        print(f"Error deleting env var: {response.status_code}")
        print(f"Response: {response.text}")
        return False

    print("Successfully deleted env var")
    return True


def main():
    """Main entry point."""
    print("=" * 60)
    print("Vercel Preview Environment Variable Cleanup")
    print("=" * 60)
    print()

    # Get configuration
    print("Step 1: Reading configuration...")
    token = get_vercel_token()
    branch = get_branch_name()
    frontend_project_name = get_frontend_project_name()
    env_var_name = get_env_var_name(branch)

    print(f"  Branch: {branch}")
    print(f"  Sanitized branch: {sanitize_branch_name(branch)}")
    print(f"  Environment variable name: {env_var_name}")
    print(f"  Target project: {frontend_project_name}")
    print()

    # Get frontend project ID
    print("Step 2: Getting frontend project ID...")
    project_id = get_project_id(token, frontend_project_name)
    print()

    # Find and delete the env var
    print("Step 3: Finding env var...")
    env_var_id = get_env_var_id(token, project_id, env_var_name)

    if not env_var_id:
        print()
        print("=" * 60)
        print(
            f"Warning: Environment variable '{env_var_name}' not found (may already be deleted)"
        )
        print("=" * 60)
        sys.exit(0)

    print()
    print("Step 4: Deleting env var...")
    success = delete_env_var(token, project_id, env_var_id)

    print()
    print("=" * 60)
    if success:
        print(f"Successfully deleted environment variable '{env_var_name}'")
        print(f"  Project: {frontend_project_name}")
    else:
        print(f"Failed to delete environment variable '{env_var_name}'")
        sys.exit(1)
    print("=" * 60)


if __name__ == "__main__":
    main()
