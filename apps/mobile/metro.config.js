const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: resolve workspace packages from the repo root.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules")
];

// Force a single React copy (mobile 18.x). Web's React 19 in packages/ui must not win.
const reactDir = path.dirname(
  require.resolve("react/package.json", { paths: [projectRoot] })
);
const reactNativeDir = path.dirname(
  require.resolve("react-native/package.json", { paths: [projectRoot] })
);

config.resolver.extraNodeModules = {
  react: reactDir,
  "react-native": reactNativeDir
};

module.exports = withNativeWind(config, { input: "./global.css" });
