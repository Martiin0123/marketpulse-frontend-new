#!/bin/bash

# Script to temporarily disable auth middleware for development
# This helps reduce Supabase rate limiting during development

echo "Disabling auth middleware for development..."
echo "This will reduce Supabase rate limiting but disable authentication checks"
echo ""

# Set environment variable to disable auth middleware
export DISABLE_AUTH_MIDDLEWARE=true

echo "DISABLE_AUTH_MIDDLEWARE=true has been set"
echo "Restart your development server to apply this change"
echo ""
echo "To re-enable auth middleware, unset the environment variable:"
echo "unset DISABLE_AUTH_MIDDLEWARE" 