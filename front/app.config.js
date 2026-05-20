import 'dotenv/config';

export default {
  expo: {
    name: "NexDose",
    icon: "./src/assets/ndIcon.png",
    slug: "nexdose-mobile",
    scheme: "nexdose",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: false, // Recomendo deixar false por enquanto para evitar o erro de native module
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nexdose.mobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./src/assets/img/ndIcon.png",
        backgroundColor: "#FFFFFF",
        googleServicesFile: "./google-services.json",
      },
      package: "com.nexdose.mobile",
      softwareKeyboardLayoutMode: "pan",
      edgeToEdgeEnabled: true,
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