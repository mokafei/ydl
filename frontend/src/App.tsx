import React, { useEffect, useMemo, useState } from "react";
import Home from "./pages/Home";
import ActivationPage from "./pages/ActivationPage";
import UpgradePage from "./pages/UpgradePage";
import { LicenseBridgeInfo, LicenseEnvelope } from "./api/license";

type ViewName = "loading" | "home" | "activation" | "upgrade";

type ThemeType = "youtube" | "kids";
type ColorMode = "light" | "dark";

interface LicenseState {
  license: LicenseEnvelope | null;
  bridge: LicenseBridgeInfo | null;
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewName>("loading");
  const [licenseState, setLicenseState] = useState<LicenseState>({ license: null, bridge: null });
  const [appTheme, setAppTheme] = useState<ThemeType>("youtube");
  const [appColorMode, setAppColorMode] = useState<ColorMode>("light");

  useEffect(() => {
    async function bootstrap() {
      if (!window.licenseAPI) {
        setView("home");
        return;
      }
      try {
        const info = await window.licenseAPI.get();
        setLicenseState({ license: info.license, bridge: info });
        setView(info.license ? "home" : "activation");
      } catch (error) {
        console.error("[app] license bootstrap failed", error);
        setView("home");
      }
    }
    bootstrap();
  }, []);

  const handleActivationSuccess = useMemo(
    () => async (envelope: LicenseEnvelope) => {
      setLicenseState((prev) => ({ ...prev, license: envelope }));
      setView("home");
    },
    [],
  );

  const bridge = licenseState.bridge;
  const openActivation = useMemo(() => {
    if (!bridge) {
      return undefined;
    }
    return () => setView("activation");
  }, [bridge]);

  if (view === "loading") {
    return <div style={{ padding: 48 }}>正在加载授权信息...</div>;
  }

  if (view === "activation" && bridge) {
    return (
      <ActivationPage
        bridgeInfo={bridge}
        initialLicense={licenseState.license}
        onActivated={handleActivationSuccess}
        onShowUpgrade={() => setView("upgrade")}
        onBackHome={() => setView("home")}
        theme={appTheme}
        colorMode={appColorMode}
      />
    );
  }

  if (view === "upgrade" && bridge) {
    return <UpgradePage bridgeInfo={bridge} onBack={() => setView("activation")} />;
  }

  return (
    <Home
      theme={appTheme}
      colorMode={appColorMode}
      onThemeChange={setAppTheme}
      onColorModeChange={setAppColorMode}
      onOpenActivation={openActivation}
    />
  );
};

export default App;
