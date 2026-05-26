/**
 * Overrides Expo autolinking when Gradle runs from android/ (cwd breaks expo’s config load).
 * @see expo/android/build.gradle namespace "expo.core" vs expo.modules.ExpoModulesPackage
 */
module.exports = {
  dependencies: {
    expo: {
      platforms: {
        android: {
          packageImportPath: 'import expo.modules.ExpoModulesPackage;',
          packageInstance: 'new ExpoModulesPackage()',
        },
      },
    },
  },
};
