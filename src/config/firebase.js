const admin = require("firebase-admin");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    // Render deployment uses this env variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT env variable:", error);
  }
} else {
  try {
    // Local development uses this file
    serviceAccount = require("./serviceAccountKey.json");
  } catch (error) {
    console.warn("Firebase service account credentials not found. Set FIREBASE_SERVICE_ACCOUNT or add serviceAccountKey.json");
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  // Fallback to default credentials
  admin.initializeApp();
}

module.exports = admin;
