import React from "react";
import { LicenseBridgeInfo } from "../api/license";
import "./UpgradePage.css";

interface UpgradePageProps {
  bridgeInfo: LicenseBridgeInfo;
  onBack: () => void;
}

const UpgradePage: React.FC<UpgradePageProps> = ({ bridgeInfo, onBack }) => {
  const payQrPath = bridgeInfo.payQrPath;

  return (
    <div className="upgrade">
      <div className="upgrade__surface">
        <header className="upgrade__header">
          <div>
            <h1>升级为高级版</h1>
            <p className="upgrade__subtitle">支付完成后联系管理员获取激活码，并在授权页输入即可升级。</p>
          </div>
          <button type="button" className="upgrade__button" onClick={onBack}>
            返回授权页
          </button>
        </header>

        <section className="upgrade__section">
          <h2>支付二维码</h2>
          {payQrPath ? (
            <div className="upgrade__qr-container">
              <img src={`file://${payQrPath.replace(/\\/g, "/")}`} alt="支付二维码" className="upgrade__qr" />
            </div>
          ) : (
            <p className="upgrade__tip">系统尚未配置二维码资源，请联系管理员。</p>
          )}
        </section>

        <section className="upgrade__section">
          <h2>升级流程</h2>
          <ol className="upgrade__steps">
            <li>扫码完成支付，备注您的账号信息。</li>
            <li>联系管理员获取高级用户激活码。</li>
            <li>返回授权页，输入激活码完成升级。</li>
            <li>如需在新设备使用，可随时在授权页注销旧设备。</li>
          </ol>
        </section>
      </div>
    </div>
  );
};

export default UpgradePage;
