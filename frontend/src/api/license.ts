import { fetchJson } from "./client";

export type UserType = "trial" | "pro";

export interface LicensePayload {
  licenseKey: string;
  userType: UserType;
  expireAt: string | null;
  maxDevices: number;
  latestVersion: string;
  minimumVersion: string;
  downloadUrl: string;
  issuedAt: string;
  trialRemainingDays: number | null;
}

export interface LicenseEnvelope {
  payload: LicensePayload;
  signature: string;
}

export interface TrialStartRequest {
  deviceId: string;
  deviceName?: string | null;
  currentVersion?: string | null;
}

export interface ActivationRequest {
  licenseKey: string;
  deviceId: string;
  deviceName?: string | null;
  currentVersion?: string | null;
}

export interface RedeemRequest {
  activationCode: string;
  deviceId: string;
  deviceName?: string | null;
  currentVersion?: string | null;
}

export interface LicenseBridgeInfo {
  license: LicenseEnvelope | null;
  deviceId: string;
  deviceName: string;
  payQrPath: string | null;
  appVersion: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string | null;
  activatedAt: string;
  lastSeenAt: string;
}

interface LicenseEnvelopeRaw {
  payload: {
    license_key: string;
    user_type: UserType;
    expire_at: string | null;
    max_devices: number;
    latest_version: string;
    minimum_version: string;
    download_url: string;
    issued_at: string;
    trial_remaining_days: number | null;
  };
  signature: string;
}

interface LicenseResponseRaw {
  status: "ok";
  license: LicenseEnvelopeRaw;
}

interface DeviceInfoRaw {
  device_id: string;
  device_name: string | null;
  activated_at: string;
  last_seen_at: string;
}

interface DeviceListResponseRaw {
  status: "ok";
  devices: DeviceInfoRaw[];
}

function mapLicenseEnvelope(raw: LicenseEnvelopeRaw): LicenseEnvelope {
  return {
    signature: raw.signature,
    payload: {
      licenseKey: raw.payload.license_key,
      userType: raw.payload.user_type,
      expireAt: raw.payload.expire_at,
      maxDevices: raw.payload.max_devices,
      latestVersion: raw.payload.latest_version,
      minimumVersion: raw.payload.minimum_version,
      downloadUrl: raw.payload.download_url,
      issuedAt: raw.payload.issued_at,
      trialRemainingDays: raw.payload.trial_remaining_days,
    },
  };
}

function mapDeviceInfo(raw: DeviceInfoRaw): DeviceInfo {
  return {
    deviceId: raw.device_id,
    deviceName: raw.device_name,
    activatedAt: raw.activated_at,
    lastSeenAt: raw.last_seen_at,
  };
}

function buildBody(payload: Record<string, unknown>): BodyInit {
  return JSON.stringify(payload);
}

export async function startTrial(request: TrialStartRequest): Promise<LicenseEnvelope> {
  const body = buildBody({
    device_id: request.deviceId,
    device_name: request.deviceName,
    current_version: request.currentVersion,
  });
  const response = await fetchJson<LicenseResponseRaw>("/license/trial/start", {
    method: "POST",
    body,
  });
  return mapLicenseEnvelope(response.license);
}

export async function activateLicense(request: ActivationRequest): Promise<LicenseEnvelope> {
  const body = buildBody({
    license_key: request.licenseKey,
    device_id: request.deviceId,
    device_name: request.deviceName,
    current_version: request.currentVersion,
  });
  const response = await fetchJson<LicenseResponseRaw>("/license/activate", {
    method: "POST",
    body,
  });
  return mapLicenseEnvelope(response.license);
}

export async function validateLicense(request: ActivationRequest): Promise<LicenseEnvelope> {
  const body = buildBody({
    license_key: request.licenseKey,
    device_id: request.deviceId,
    current_version: request.currentVersion,
  });
  const response = await fetchJson<LicenseResponseRaw>("/license/validate", {
    method: "POST",
    body,
  });
  return mapLicenseEnvelope(response.license);
}

export async function redeemActivationCode(request: RedeemRequest): Promise<LicenseEnvelope> {
  const body = buildBody({
    activation_code: request.activationCode,
    device_id: request.deviceId,
    device_name: request.deviceName,
    current_version: request.currentVersion,
  });
  const response = await fetchJson<LicenseResponseRaw>("/license/redeem", {
    method: "POST",
    body,
  });
  return mapLicenseEnvelope(response.license);
}

export async function listDevices(licenseKey: string): Promise<DeviceInfo[]> {
  const response = await fetchJson<DeviceListResponseRaw>(`/license/devices?license_key=${encodeURIComponent(licenseKey)}`);
  return response.devices.map(mapDeviceInfo);
}

export async function removeDevice(licenseKey: string, deviceId: string): Promise<DeviceInfo[]> {
  const response = await fetchJson<DeviceListResponseRaw>(`/license/devices/${encodeURIComponent(deviceId)}?license_key=${encodeURIComponent(licenseKey)}`, {
    method: "DELETE",
  });
  return response.devices.map(mapDeviceInfo);
}

export async function getProfile(licenseKey: string, deviceId?: string): Promise<LicenseEnvelope> {
  const params = new URLSearchParams({ license_key: licenseKey });
  if (deviceId) {
    params.set("device_id", deviceId);
  }
  const response = await fetchJson<LicenseResponseRaw>(`/license/profile?${params.toString()}`);
  return mapLicenseEnvelope(response.license);
}
