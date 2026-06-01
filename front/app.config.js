// app.config.js (Substitua todo o arquivo por este)
require('dotenv').config();

export default {
  expo: {
    name: "NexDose",
    slug: "nexdose-mobile",
    scheme: "nexdose",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/img/ndIcon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nexdose.mobile",
      //googleServicesFile: "./GoogleService-Info.plist",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "SUA_CHAVE_AQUI", // 🔥 Adicione a string direta aqui se o dotenv falhar
      }
    },

    android: {
      package: "com.nexdose.mobile",
      //googleServicesFile: "./google-services.json",
      softwareKeyboardLayoutMode: "pan",
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        foregroundImage: "./src/assets/img/ndIcon.png",
        backgroundColor: "#FFFFFF"
      },
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || "SUA_CHAVE_AQUI", // 🔥 Adicione a string direta aqui para testar
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
