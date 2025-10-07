import type { LicenseBridgeInfo, LicenseEnvelope } from "../api/license";

declare global {
  interface Window {
    licenseAPI?: {
      get: () => Promise<LicenseBridgeInfo>;
      save: (envelope: LicenseEnvelope) => Promise<{ status: string }>;
      clear: () => Promise<{ status: string }>;
      openExternal: (url: string) => Promise<{ status: string; message?: string }>;
    };
  }
}

export {};
