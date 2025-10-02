#!/bin/bash

# Development script with DEBUG logging enabled
# This script sets REACT_APP_LOG_LEVEL=3 (DEBUG) for enhanced development logging

echo "🚀 Starting development server with DEBUG logging enabled..."
echo "📊 Log Level: DEBUG (3)"
echo "🔍 All logs will be visible including detailed debugging information"
echo ""

# Set environment variable for DEBUG logging
export REACT_APP_LOG_LEVEL=3

# Start the React development server
npm start