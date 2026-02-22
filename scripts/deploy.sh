#!/bin/bash
set -e

echo "🚀 Deploying to Fly.io..."

# Ensure we're on a clean git state
if [[ -n $(git status --porcelain) ]]; then
  echo "⚠️  Warning: You have uncommitted changes"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Run build (includes type checking)
echo "📝 Running build..."
npm run build

# Deploy to Fly
echo "🛫 Deploying to Fly.io..."
fly deploy

# Show app status
echo ""
echo "✅ Deployment complete!"
echo ""
fly status

echo ""
echo "🔗 App URL: https://infinitearmory.fly.dev"
