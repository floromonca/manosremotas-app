import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium"],

  outputFileTracingIncludes: {
    "/*": ["./node_modules/@sparticuz/chromium/**/*"],
    "/api/invoices/[invoiceId]/pdf": ["./node_modules/@sparticuz/chromium/**/*"],
    "/api/invoices/*/pdf": ["./node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;