#!/bin/bash
# Exit on any error
set -e

echo "🌍 EcoTrack AI Deployment Utility"
echo "================================="

# 1. Ensure user is logged in
echo "🔑 Checking Firebase authentication status..."
npx firebase-tools login

# 2. Check if Vite app builds successfully
echo "📦 Building production assets..."
npm run build

# 3. Initialize Firebase project binding if missing
if [ ! -f .firebaserc ]; then
  echo "📂 No Firebase project binding (.firebaserc) found."
  echo "Please select or create a Firebase project from your account:"
  npx firebase-tools use --add
fi

# 4. Deploy assets and Cloud Functions
echo "🚀 Deploying to Firebase Hosting & Functions..."
npx firebase-tools deploy

echo "================================="
echo "🎉 EcoTrack AI has been successfully deployed!"
