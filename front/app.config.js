import 'dotenv/config';
import fs from 'node:fs';

const googleServicesFile = './google-services.json';
const googleServiceInfoFile = './GoogleService-Info.plist';

export default {
  expo: {
    owner: "nexdose",
    name: "NexDose",
    slug: "nexdose-mobile",
    scheme: "nexdose",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/img/ndIcon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false, // Mantido em false para garantir compatibilidade com módulos nativos atuais

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nexdose.mobile",
      ...(fs.existsSync(googleServiceInfoFile) ? { googleServicesFile: googleServiceInfoFile } : {})
    },

    android: {
      package: "com.nexdose.mobile",
      ...(fs.existsSync(googleServicesFile) ? { googleServicesFile } : {}),
      softwareKeyboardLayoutMode: "pan",
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        foregroundImage: "./src/assets/img/ndIcon.png",
        backgroundColor: "#FFFFFF"
      },
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        }
      }
    },

    web: {
      bundler: "metro"
    },

    plugins: [
      [
        "expo-notifications",
        {
          icon: "./src/assets/img/ndIcon.png",
        }
      ]
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      router: {},
      eas: {
        projectId: "643e49d5-981e-4c58-8613-9661e3e8fb21"
      }
    }
  }
};
