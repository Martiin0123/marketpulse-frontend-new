#!/bin/bash

# Vercel Readiness Check Script
set -e

echo "🔍 Checking Vercel deployment readiness..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES=0

# Check if Next.js config is Vercel-optimized
echo "📋 Checking Next.js configuration..."
if grep -q 'output.*standalone' next.config.js; then
    echo -e "${RED}❌ Found 'output: standalone' in next.config.js${NC}"
    echo "   This should be removed for Vercel deployment"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ Next.js config is Vercel-optimized${NC}"
fi

# Check if vercel.json exists and is configured
echo ""
echo "📋 Checking Vercel configuration..."
if [ -f "vercel.json" ]; then
    echo -e "${GREEN}✅ vercel.json exists${NC}"
    
    # Check for function configurations
    if grep -q '"functions"' vercel.json; then
        echo -e "${GREEN}✅ Function timeouts configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Function timeouts not configured${NC}"
    fi
else
    echo -e "${RED}❌ vercel.json not found${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check middleware configuration
echo ""
echo "📋 Checking middleware configuration..."
if [ -f "middleware.ts" ]; then
    echo -e "${GREEN}✅ middleware.ts exists${NC}"
    
    # Check if middleware is optimized (has config.matcher)
    if grep -q "config.*matcher" middleware.ts; then
        echo -e "${GREEN}✅ Middleware has optimized route matching${NC}"
    else
        echo -e "${YELLOW}⚠️  Middleware might not be optimized${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No middleware.ts found (optional)${NC}"
fi

# Check for .vercelignore
echo ""
echo "📋 Checking deployment optimization..."
if [ -f ".vercelignore" ]; then
    echo -e "${GREEN}✅ .vercelignore exists${NC}"
else
    echo -e "${YELLOW}⚠️  .vercelignore not found (recommended)${NC}"
fi

# Check package.json for Vercel scripts
echo ""
echo "📋 Checking deployment scripts..."
if grep -q "vercel:deploy" package.json; then
    echo -e "${GREEN}✅ Vercel deployment scripts available${NC}"
else
    echo -e "${YELLOW}⚠️  Vercel scripts not found in package.json${NC}"
fi

# Check for environment setup guide
echo ""
echo "📋 Checking documentation..."
if [ -f "VERCEL_ENV_SETUP.md" ]; then
    echo -e "${GREEN}✅ Vercel environment setup guide exists${NC}"
else
    echo -e "${YELLOW}⚠️  Environment setup guide not found${NC}"
fi

# Check if Vercel CLI is installed
echo ""
echo "📋 Checking Vercel CLI..."
if command -v vercel &> /dev/null; then
    echo -e "${GREEN}✅ Vercel CLI is installed${NC}"
    
    # Check if logged in
    if vercel whoami &> /dev/null; then
        echo -e "${GREEN}✅ Logged into Vercel CLI${NC}"
    else
        echo -e "${YELLOW}⚠️  Not logged into Vercel CLI${NC}"
        echo "   Run: vercel login"
    fi
else
    echo -e "${YELLOW}⚠️  Vercel CLI not installed${NC}"
    echo "   Run: npm install -g vercel@latest"
fi

# Check build process
echo ""
echo "📋 Testing build process..."
echo "   Running: npm run build"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    echo "   Check build errors with: npm run build"
    ISSUES=$((ISSUES + 1))
fi

# Summary
echo ""
echo "============================================"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 Project is ready for Vercel deployment!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm run vercel:deploy"
    echo "2. Set up environment variables (see VERCEL_ENV_SETUP.md)"
    echo "3. Update Stripe webhook URL and Discord redirect URI"
else
    echo -e "${RED}⚠️  Found $ISSUES issue(s) that should be addressed${NC}"
    echo ""
    echo "Please fix the issues above before deploying to Vercel."
fi
echo "============================================"
echo ""

# Deployment checklist
echo "📝 Post-deployment checklist:"
echo "   □ Set environment variables in Vercel dashboard"
echo "   □ Update Stripe webhook URL to: https://your-app.vercel.app/api/webhook"
echo "   □ Update Discord redirect URI to: https://your-app.vercel.app/api/auth/discord/callback"
echo "   □ Update NEXT_PUBLIC_SITE_URL to your Vercel URL"
echo "   □ Test authentication flow"
echo "   □ Test Stripe payments"
echo "   □ Test Discord integration" 