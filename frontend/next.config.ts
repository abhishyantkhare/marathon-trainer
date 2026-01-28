import type { NextConfig } from "next";

/**
 * Compute the preview backend URL from branch-specific environment variable.
 * The GitHub Actions workflow sets NEXT_PUBLIC_API_URL_{SANITIZED_BRANCH}
 * on the frontend Vercel project for each PR branch.
 */
const computePreviewBackendUrl = (): string | undefined => {
  const branchName = process.env.VERCEL_GIT_COMMIT_REF;
  if (!branchName) return undefined;

  // Sanitize branch name to match Python script logic:
  // - Replace non-alphanumeric characters with underscores
  // - Convert to uppercase
  // - Truncate to 43 characters (63 max env var length - 20 char prefix)
  const sanitizedBranch = branchName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toUpperCase()
    .slice(0, 43);

  const envVarName = `NEXT_PUBLIC_API_URL_${sanitizedBranch}`;
  return process.env[envVarName];
};

const previewBackendUrl = computePreviewBackendUrl() || "";

const nextConfig: NextConfig = {
  env: {
    // Used by client code in preview deployments to point to the preview backend
    NEXT_PUBLIC_PREVIEW_BACKEND_URL: previewBackendUrl,
    // Used by client code to detect preview deployments
    NEXT_PUBLIC_VERCEL_TARGET_ENV:
      process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || "",
  },
};

export default nextConfig;
