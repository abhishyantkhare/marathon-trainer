import type { NextConfig } from "next";

/**
 * Compute the preview backend URL from branch-specific environment variable.
 * This bridges the dynamic env var (NEXT_PUBLIC_API_URL_{SANITIZED_BRANCH})
 * set by the GitHub Actions workflow to a stable env var for the app.
 */
const computePreviewBackendUrl = (): string | undefined => {
  const branchName = process.env.VERCEL_GIT_COMMIT_REF;
  if (!branchName) return undefined;

  // Sanitize branch name using the same rules as the Python script
  const sanitizedBranch = branchName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toUpperCase()
    .slice(0, 43); // MAX_BRANCH_SUFFIX_LENGTH = 63 - 20 = 43

  const envVarName = `NEXT_PUBLIC_API_URL_${sanitizedBranch}`;
  return process.env[envVarName];
};

const previewBackendUrl = computePreviewBackendUrl() || "";

const nextConfig: NextConfig = {
  env: {
    // Used by client code in preview deployments
    NEXT_PUBLIC_PREVIEW_BACKEND_URL: previewBackendUrl,
    // Used by client code to detect preview deployments
    NEXT_PUBLIC_VERCEL_TARGET_ENV:
      process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || "",
    // Optional: used by server code (route handlers, server components)
    INTERNAL_PREVIEW_API_URL: previewBackendUrl,
  },
};

export default nextConfig;
