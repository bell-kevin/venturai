const path = require("node:path");

// Use absolute paths so prebuild resolves images correctly (fixes monorepo path issues)
const projectRoot = __dirname;
const assetsDir = path.join(projectRoot, "assets/images/expo-icons");
const iconPath = path.join(assetsDir, "icon.png");
const adaptiveIconPath = path.join(assetsDir, "adaptive-icon.png");
const splashIconPath = path.join(assetsDir, "splash-icon.png");
// const splashImagePath = path.join(assetsDir, "splash.png");
const faviconPath = path.join(assetsDir, "favicon.png");

// Plugin: copy icon to splashscreen_logo (required when splash image disabled)
const withSplashLogoDrawable = require("./plugins/withSplashLogoDrawable.cjs");
const withNfcIntentFilter = require("./plugins/withNfcIntentFilter.cjs");
const withAgpUnify = require("./plugins/withAgpUnify.cjs");

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Venturai",
  slug: "venturai",
  version: "1.0.0",
  orientation: "portrait",
  icon: iconPath,
  scheme: "venturai",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: { supportsTablet: true },
  android: {
    adaptiveIcon: {
      foregroundImage: adaptiveIconPath,
      backgroundColor: "#030812",
    },
    permissions: ["android.permission.NFC", "android.permission.RECORD_AUDIO"],
    package: "com.venturai",
  },
  plugins: [
    "expo-router",
    [
      "react-native-nfc-manager",
      { nfcPermission: "Venturai uses NFC to register and read asset tags" },
    ],
    [
      "expo-image-picker",
      { cameraPermission: "Venturai needs camera access to photograph assets" },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#030812",
        image: splashIconPath,
        imageWidth: 200,
        resizeMode: "contain",
      },
    ],
    [withSplashLogoDrawable, { iconPath: splashIconPath }],
    withNfcIntentFilter,
    withAgpUnify,
  ],
  web: { favicon: faviconPath },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
    autolinkingModuleResolution: true,
  },
  extra: {
    router: { origin: "https://venturai.app" },
    eas: { projectId: "d1021b5d-7f26-48f5-823d-3b0b068313b7" },
  },
};

module.exports = config;
