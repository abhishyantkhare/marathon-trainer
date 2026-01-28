import type { NextConfig } from "next";

/**
 * Compute the preview backend URL from branch-specific env var.
 *
 * The GitHub Actions workflow sets NEXT_PUBLIC_API_URL_{SANITIZED_BRANCH}
 * on the frontend Vercel project. This function reads that value at build time
 * and exposes it as NEXT_PUBLIC_PREVIEW_BACKEND_URL for client code.
 */
const computePreviewBackendUrl = (): string | undefined => {
  const branchName = process.env.VERCEL_GIT_COMMIT_REF;
  if (!branchName) return undefined;

  // Sanitize branch name using the same rules as the Python script
  const sanitizedBranch = branchName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toUpperCase()
    .slice(0, 43); // Max 63 chars total, minus 20 char prefix = 43

  const envVarName = `NEXT_PUBLIC_API_URL_${sanitizedBranch}`;
  return process.env[envVarName];
};

const previewBackendUrl = computePreviewBackendUrl() || "";

const nextConfig: NextConfig = {
  env: {
    // Used by client code in preview deployments to connect to preview backend
    NEXT_PUBLIC_PREVIEW_BACKEND_URL: previewBackendUrl,
    // Used by client code to detect preview vs production deployments
    NEXT_PUBLIC_VERCEL_TARGET_ENV:
      process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || "",
  },
};

export default nextConfig;
