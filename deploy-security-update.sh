#!/bin/bash

# Security update deployment script
# Only deploys the updated functions to avoid quota issues

echo "🔒 Deploying LinkLearn security updates..."
echo "⚠️  This will deploy enhanced security measures for Gemini API usage"

# Confirm deployment
read -p "Deploy security updates? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo "🚀 Building and deploying security-enhanced functions..."

# Build the functions first
cd /Users/srinibaj/Files/ok/functions
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Deployment aborted."
    exit 1
fi

echo "📦 Deploying only the updated functions..."

# Deploy only the core proxy functions (not all functions to avoid quota)
firebase deploy --only functions:linkLearnProxy,functions:emergencyDisableReasoning,functions:linkLearnLiveProxy --project linklearn-ai

if [ $? -eq 0 ]; then
    echo "✅ Security updates deployed successfully!"
    echo ""
    echo "🛡️  New security features:"
    echo "   • Strict model whitelist validation"
    echo "   • Enhanced usage tracking and logging"
    echo "   • Emergency reasoning disable capability"
    echo "   • Detailed request metadata logging"
    echo ""
    echo "🔍 Monitor logs with:"
    echo "   firebase functions:log --project linklearn-ai"
    echo ""
    echo "🚨 Emergency disable reasoning (admin only):"
    echo "   Call 'emergencyDisableReasoning' function from console"
else
    echo "❌ Deployment failed. Check the logs above."
    exit 1
fi
