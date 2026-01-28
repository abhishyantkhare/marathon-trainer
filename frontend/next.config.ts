import type { NextConfig } from "next";

/**
 * Compute the preview backend URL from the branch-specific environment variable.
 * This is used to bridge the dynamically-named env var (set by GitHub Actions)
 * to a stable env var that the frontend code can consume.
 */
const computePreviewBackendUrl = (): string | undefined => {
  const branchName = process.env.VERCEL_GIT_COMMIT_REF;
  if (!branchName) return undefined;

  // Sanitize branch name using the same rules as the Python script
  const sanitizedBranch = branchName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toUpperCase()
    .slice(0, 43); // MAX_BRANCH_SUFFIX_LENGTH = 63 - 20 (prefix length) = 43

  const envVarName = `NEXT_PUBLIC_API_URL_${sanitizedBranch}`;
  return process.env[envVarName];
};

const previewBackendUrl = computePreviewBackendUrl() || "";

const nextConfig: NextConfig = {
  env: {
    // Used by client code in preview deployments to connect to the preview backend
    NEXT_PUBLIC_PREVIEW_BACKEND_URL: previewBackendUrl,
    // Used by client code to detect preview deployments
    NEXT_PUBLIC_VERCEL_TARGET_ENV:
      process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || "",
    // Optional: used by server code (route handlers, server components)
    INTERNAL_PREVIEW_API_URL: previewBackendUrl,
  },
};

export default nextConfig;
