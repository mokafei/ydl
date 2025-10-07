import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  activateLicense,
  getProfile,
  listDevices,
  removeDevice,
  redeemActivationCode,
  startTrial as startTrialApi,
  DeviceInfo,
  LicenseBridgeInfo,
  LicenseEnvelope,
} from "../api/license";
import "./ActivationPage.css";

interface ActivationPageProps {
  bridgeInfo: LicenseBridgeInfo;
  initialLicense: LicenseEnvelope | null;
  onActivated: (license: LicenseEnvelope) => void | Promise<void>;
  onShowUpgrade: () => void;
  onBackHome: () => void;
  theme: "youtube" | "kids";
  colorMode: "light" | "dark";
}

const ActivationPage: React.FC<ActivationPageProps> = ({
  bridgeInfo,
  initialLicense,
  onActivated,
  onShowUpgrade,
  onBackHome,
  theme,
  colorMode,
}) => {
  const [license, setLicense] = useState<LicenseEnvelope | null>(initialLicense);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);
  const hasAttemptedTrialRef = useRef(false);
  const activatedKeyRef = useRef<string | null>(null);
  const hasFetchedProfileRef = useRef(false);

  const currentDeviceName = bridgeInfo.deviceName ?? "当前设备";

  const refreshDevices = useCallback(
    async (licenseKey: string) => {
      try {
        const list = await listDevices(licenseKey);
        setDevices(list);
      } catch (error) {
        console.warn("[license] 获取设备列表失败", error);
        setDevices([]);
      }
    },
    [],
  );

  const saveLicense = useCallback(async (envelope: LicenseEnvelope) => {
    setLicense(envelope);
    if (window.licenseAPI) {
      await window.licenseAPI.save(envelope);
    }
  }, []);

  useEffect(() => {
    setLicense(initialLicense);
    hasFetchedProfileRef.current = false;
  }, [initialLicense]);

  useEffect(() => {
    if (license) {
      return;
    }
    if (hasAttemptedTrialRef.current) {
      return;
    }
    hasAttemptedTrialRef.current = true;

    const bootstrapTrial = async () => {
      setLoadingMessage("正在创建体验账号...");
      setErrorMessage(null);
      try {
        const trialEnvelope = await startTrialApi({
          deviceId: bridgeInfo.deviceId,
          deviceName: currentDeviceName,
          currentVersion: bridgeInfo.appVersion,
        });
        await saveLicense(trialEnvelope);
      } catch (error) {
        const message = error instanceof Error ? error.message : "创建体验账号失败";
        setErrorMessage(message);
      } finally {
        setLoadingMessage(null);
      }
    };

    void bootstrapTrial();
  }, [bridgeInfo.deviceId, bridgeInfo.appVersion, currentDeviceName, license, saveLicense]);

  useEffect(() => {
    if (!license) {
      return;
    }
    if (!hasFetchedProfileRef.current) {
      hasFetchedProfileRef.current = true;
      const refreshProfile = async () => {
        try {
          const profileEnvelope = await getProfile(license.payload.licenseKey, bridgeInfo.deviceId);
          await saveLicense(profileEnvelope);
        } catch (error) {
          console.warn("[license] 获取账号信息失败", error);
        }
      };
      void refreshProfile();
    }
    const activationKey = `${license.payload.licenseKey}:${bridgeInfo.deviceId}`;
    if (activatedKeyRef.current === activationKey) {
      void refreshDevices(license.payload.licenseKey);
      return;
    }
    activatedKeyRef.current = activationKey;

    const ensureActivation = async () => {
      setLoadingMessage("正在绑定本设备...");
      setErrorMessage(null);
      try {
        const activatedEnvelope = await activateLicense({
          licenseKey: license.payload.licenseKey,
          deviceId: bridgeInfo.deviceId,
          deviceName: currentDeviceName,
          currentVersion: bridgeInfo.appVersion,
        });
        await saveLicense(activatedEnvelope);
        await refreshDevices(activatedEnvelope.payload.licenseKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : "设备绑定失败";
        setErrorMessage(message);
      } finally {
        setLoadingMessage(null);
      }
    };

    void ensureActivation();
  }, [bridgeInfo.deviceId, bridgeInfo.appVersion, currentDeviceName, license, refreshDevices, saveLicense]);

  const licensePayload = license?.payload;
  const isPro = licensePayload?.userType === "pro";
  const trialInfo = useMemo(() => {
    if (!licensePayload) {
      return null;
    }
    const expireAt = licensePayload.expireAt ? new Date(licensePayload.expireAt) : null;
    return {
      expireText: expireAt ? expireAt.toLocaleString() : "不限期",
      remainingDays: licensePayload.trialRemainingDays,
    };
  }, [licensePayload]);

  const handleRedeem = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!redeemCode.trim()) {
        setErrorMessage("请输入激活码");
        return;
      }
      setRedeeming(true);
      setErrorMessage(null);
      try {
        const redeemedEnvelope = await redeemActivationCode({
          activationCode: redeemCode.trim(),
          deviceId: bridgeInfo.deviceId,
          deviceName: currentDeviceName,
          currentVersion: bridgeInfo.appVersion,
        });
        await saveLicense(redeemedEnvelope);
        const activatedEnvelope = await activateLicense({
          licenseKey: redeemedEnvelope.payload.licenseKey,
          deviceId: bridgeInfo.deviceId,
          deviceName: currentDeviceName,
          currentVersion: bridgeInfo.appVersion,
        });
        await saveLicense(activatedEnvelope);
        await refreshDevices(activatedEnvelope.payload.licenseKey);
        setRedeemCode("");
        await onActivated(activatedEnvelope);
      } catch (error) {
        const message = error instanceof Error ? error.message : "激活码兑换失败";
        setErrorMessage(message);
      } finally {
        setRedeeming(false);
      }
    },
    [bridgeInfo.deviceId, bridgeInfo.appVersion, currentDeviceName, onActivated, redeemCode, refreshDevices, saveLicense],
  );

  const handleRemoveDevice = useCallback(
    async (deviceId: string) => {
      if (!licensePayload) {
        return;
      }
      setRemovingDeviceId(deviceId);
      setErrorMessage(null);
      try {
        const updated = await removeDevice(licensePayload.licenseKey, deviceId);
        setDevices(updated);
      } catch (error) {
        const message = error instanceof Error ? error.message : "注销设备失败";
        setErrorMessage(message);
      } finally {
        setRemovingDeviceId(null);
      }
    },
    [licensePayload],
  );

  const activationClassName = useMemo(() => `activation activation--${theme} activation--${colorMode}`, [theme, colorMode]);

  return (
    <div className={activationClassName}>
      <div className="activation__surface">
        <header className="activation__header">
          <div>
            <h1>账号授权中心</h1>
            <p className="activation__subtitle">当前设备：{currentDeviceName}</p>
            {licensePayload && (
              <p className="activation__subtitle">当前账号类型：{isPro ? "高级用户" : "体验用户"}</p>
            )}
          </div>
          <div className="activation__actions">
            <button type="button" onClick={onBackHome} className="activation__button activation__button--ghost">
              返回首页
            </button>
            <button type="button" onClick={onShowUpgrade} className="activation__button activation__button--primary">
              升级为高级版
            </button>
          </div>
        </header>

        {loadingMessage && <div className="activation__notice activation__notice--info">{loadingMessage}</div>}
        {errorMessage && <div className="activation__notice activation__notice--error">{errorMessage}</div>}

        {licensePayload ? (
          <section className="activation__section">
            <h2>授权状态</h2>
            <div className="activation__license-card">
              <div className="activation__license-row">
                <span className="activation__label">用户类型：</span>
                <span className="activation__value">{isPro ? "高级用户" : "体验用户"}</span>
              </div>
              <div className="activation__license-row">
                <span className="activation__label">授权编号：</span>
                <span className="activation__value activation__value--mono">{licensePayload.licenseKey}</span>
              </div>
              <div className="activation__license-row">
                <span className="activation__label">最大设备数：</span>
                <span className="activation__value">{licensePayload.maxDevices} 台</span>
              </div>
              {trialInfo && (
                <div className="activation__license-row">
                  <span className="activation__label">到期时间：</span>
                  <span className="activation__value">{trialInfo.expireText}</span>
                </div>
              )}
              {trialInfo?.remainingDays != null && (
                <div className="activation__license-row">
                  <span className="activation__label">剩余天数：</span>
                  <span className="activation__value">{trialInfo.remainingDays} 天</span>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="activation__section">
            <h2>授权状态</h2>
            <p>正在初始化体验授权，请稍候...</p>
          </section>
        )}

        <section className="activation__section">
          <h2>兑换激活码</h2>
          <form className="activation__redeem" onSubmit={handleRedeem}>
            <input
              type="text"
              placeholder="输入管理员提供的激活码"
              value={redeemCode}
              onChange={(event) => setRedeemCode(event.target.value)}
              className="activation__input"
            />
            <button
              type="submit"
              className="activation__button activation__button--primary"
              disabled={redeeming || !redeemCode.trim()}
            >
              {redeeming ? "兑换中..." : "立即激活"}
            </button>
          </form>
          <p className="activation__tip">激活成功后会自动覆盖当前体验授权。</p>
        </section>

        <section className="activation__section">
          <h2>已绑定设备</h2>
          {devices.length === 0 ? (
            <p className="activation__tip">暂未绑定其他设备。当在新设备登录时会自动占用名额。</p>
          ) : (
            <table className="activation__table">
              <thead>
                <tr>
                  <th>设备名称</th>
                  <th>激活时间</th>
                  <th>最近使用</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.deviceId}>
                    <td>{device.deviceName ?? "未命名设备"}</td>
                    <td>{new Date(device.activatedAt).toLocaleString()}</td>
                    <td>{new Date(device.lastSeenAt).toLocaleString()}</td>
                    <td>
                      <button
                        type="button"
                        className="activation__button activation__button--link"
                        onClick={() => handleRemoveDevice(device.deviceId)}
                        disabled={removingDeviceId === device.deviceId}
                      >
                        {removingDeviceId === device.deviceId ? "处理中..." : "注销"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="activation__tip">如需在新设备上使用，请先注销多余设备，系统限制最多 3 台设备绑定。</p>
        </section>
      </div>
    </div>
  );
};

export default ActivationPage;
