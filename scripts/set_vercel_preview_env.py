#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "requests",
# ]
# ///
"""
Set Vercel preview environment variable for the current branch.

This script:
1. Sleeps for 30 seconds to give Vercel time to deploy
2. Fetches the Vercel preview deployment URL for the backend project
3. Creates/updates a NEXT_PUBLIC_API_URL_{branch_name} environment variable on the frontend project

Required environment variables:
- VERCEL_TOKEN: Your Vercel API token
- BRANCH_NAME: The branch to get preview URL for
- BACKEND_PROJECT_NAME: The Vercel project name for the backend
- FRONTEND_PROJECT_NAME: The Vercel project name for the frontend
"""

import os
import re
import sys
import time

import requests

# Constants
VERCEL_API_BASE = "https://api.vercel.com"
ENV_VAR_PREFIX = "NEXT_PUBLIC_API_URL_"
MAX_ENV_VAR_LENGTH = 63
MAX_BRANCH_SUFFIX_LENGTH = MAX_ENV_VAR_LENGTH - len(ENV_VAR_PREFIX)  # 43 characters
DEPLOY_WAIT_SECONDS = 30


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


def get_project_names() -> tuple[str, str]:
    """Get backend and frontend project names from environment variables."""
    backend = os.environ.get("BACKEND_PROJECT_NAME")
    frontend = os.environ.get("FRONTEND_PROJECT_NAME")

    if not backend:
        print("Error: BACKEND_PROJECT_NAME environment variable is not set")
        sys.exit(1)
    if not frontend:
        print("Error: FRONTEND_PROJECT_NAME environment variable is not set")
        sys.exit(1)

    return backend, frontend


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


def get_preview_deployment_url(token: str, project_id: str, branch: str) -> str | None:
    """
    Get the preview deployment URL for a specific branch.

    Returns the deployment URL if found, or None if no preview deployment exists.
    This allows graceful degradation for branches/repos without Vercel preview deployments.
    """
    print(f"Fetching preview deployment for branch '{branch}'...")

    # List deployments filtered by project and branch
    response = make_vercel_request(
        method="GET",
        endpoint="/v6/deployments",
        token=token,
        params={
            "projectId": project_id,
            "target": "preview",
            "limit": 100,
        },
    )

    if response.status_code != 200:
        print(f"Error fetching deployments: {response.status_code}")
        print(f"Response: {response.text}")
        sys.exit(1)

    deployments_data = response.json()
    deployments = deployments_data.get("deployments", [])

    print(f"Found {len(deployments)} preview deployments")

    # Find the most recent deployment for this branch
    for deployment in deployments:
        deployment_branch = deployment.get("meta", {}).get("githubCommitRef", "")
        if deployment_branch == branch:
            url = deployment.get("url")
            if url:
                # Ensure URL has https:// prefix
                if not url.startswith("https://"):
                    url = f"https://{url}"
                print(f"Found deployment URL for branch '{branch}': {url}")
                return url

    # No preview deployment found - return None to allow graceful degradation
    print(f"Warning: No preview deployment found for branch '{branch}'")
    print("Available deployments (showing first 10):")
    for d in deployments[:10]:
        branch_ref = d.get("meta", {}).get("githubCommitRef", "unknown")
        url = d.get("url", "no url")
        state = d.get("state", "unknown")
        print(f"  - branch='{branch_ref}' url='{url}' state='{state}'")
    return None


def get_existing_env_var(token: str, project_id: str, env_var_name: str) -> str | None:
    """Check if an environment variable already exists and return its ID."""
    print(f"Checking for existing env var '{env_var_name}'...")

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
            print(
                f"Found existing env var '{env_var_name}' with ID: {env_var.get('id')}"
            )
            return env_var.get("id")

    print(f"No existing env var '{env_var_name}' found")
    return None


def delete_env_var(token: str, project_id: str, env_var_id: str) -> bool:
    """Delete an existing environment variable."""
    print(f"Deleting existing env var with ID '{env_var_id}'...")

    response = make_vercel_request(
        method="DELETE",
        endpoint=f"/v10/projects/{project_id}/env/{env_var_id}",
        token=token,
    )

    if response.status_code not in [200, 204]:
        print(f"Warning: Failed to delete env var: {response.status_code}")
        print(f"Response: {response.text}")
        return False

    print("Successfully deleted existing env var")
    return True


def create_env_var(
    token: str, project_id: str, env_var_name: str, env_var_value: str
) -> None:
    """Create a new environment variable for the preview target."""
    print(f"Creating env var '{env_var_name}' with value '{env_var_value}'...")

    response = make_vercel_request(
        method="POST",
        endpoint=f"/v10/projects/{project_id}/env",
        token=token,
        json_data={
            "key": env_var_name,
            "value": env_var_value,
            "type": "plain",
            "target": ["preview"],
        },
    )

    if response.status_code not in [200, 201]:
        print(f"Error creating env var: {response.status_code}")
        print(f"Response: {response.text}")
        sys.exit(1)

    print(f"Successfully created env var '{env_var_name}'")


def main():
    """Main entry point."""
    print("=" * 60)
    print("Vercel Preview Environment Variable Setup")
    print("=" * 60)
    print()

    # Get configuration
    print("Step 1: Reading configuration...")
    token = get_vercel_token()
    branch = get_branch_name()
    backend_project_name, frontend_project_name = get_project_names()
    env_var_name = get_env_var_name(branch)

    print(f"  Branch: {branch}")
    print(f"  Sanitized branch: {sanitize_branch_name(branch)}")
    print(f"  Environment variable name: {env_var_name}")
    print(f"  Backend project (source): {backend_project_name}")
    print(f"  Frontend project (target): {frontend_project_name}")
    print()

    # Wait for Vercel deployment
    print(f"Step 2: Waiting {DEPLOY_WAIT_SECONDS} seconds for Vercel deployment...")
    time.sleep(DEPLOY_WAIT_SECONDS)
    print("  Done waiting.")
    print()

    # Get backend project ID (to fetch deployment URL)
    print("Step 3: Getting backend project ID...")
    backend_project_id = get_project_id(token, backend_project_name)
    print()

    # Get frontend project ID (to set env var)
    print("Step 4: Getting frontend project ID...")
    frontend_project_id = get_project_id(token, frontend_project_name)
    print()

    # Get deployment URL from backend project
    print("Step 5: Getting backend deployment URL...")
    deployment_url = get_preview_deployment_url(token, backend_project_id, branch)
    print()

    # Graceful degradation: if no preview deployment exists, skip setting the env var
    # and exit successfully. This allows CI to pass for branches/repos that don't have
    # Vercel preview deployments configured.
    if deployment_url is None:
        print("=" * 60)
        print("Warning: No preview deployment found - skipping env var setup")
        print(f"  Branch '{branch}' does not have a Vercel preview deployment.")
        print("  This is not an error - CI will continue without the preview URL.")
        print("=" * 60)
        sys.exit(0)

    # Check for existing env var on frontend project and delete if exists
    print("Step 6: Checking for existing env var on frontend project...")
    existing_env_var_id = get_existing_env_var(token, frontend_project_id, env_var_name)
    if existing_env_var_id:
        delete_env_var(token, frontend_project_id, existing_env_var_id)
    print()

    # Create new env var on frontend project
    print("Step 7: Creating env var on frontend project...")
    create_env_var(token, frontend_project_id, env_var_name, deployment_url)

    print()
    print("=" * 60)
    print("Successfully set preview environment variable!")
    print(f"  Project: {frontend_project_name}")
    print(f"  {env_var_name}={deployment_url}")
    print("=" * 60)


if __name__ == "__main__":
    main()
