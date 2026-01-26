#!/bin/bash

# Script to run Firebase emulator and test note generation

echo "🔥 Starting Firebase Emulator Test"
echo "===================================="
echo ""

# Check if emulator is already running
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 8080 is already in use. Stopping existing emulator..."
    pkill -f "firebase.*emulators:start" || true
    sleep 2
fi

echo "📦 Building functions..."
cd functions
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
cd ..

echo ""
echo "🚀 Starting Firebase Emulator..."
echo "   This will start in the background"
echo "   Press Ctrl+C to stop"
echo ""

# Start emulator in background
firebase emulators:start --only functions,firestore --project linklearn-ai &
EMULATOR_PID=$!

# Wait for emulator to start
echo "⏳ Waiting for emulator to start..."
sleep 5

# Check if emulator started successfully
if ! ps -p $EMULATOR_PID > /dev/null; then
    echo "❌ Emulator failed to start!"
    exit 1
fi

echo "✅ Emulator started (PID: $EMULATOR_PID)"
echo ""
echo "🧪 Running test..."
echo ""

# Run test script
cd functions
node test-emulator.js
TEST_RESULT=$?

# Clean up
echo ""
echo "🛑 Stopping emulator..."
kill $EMULATOR_PID 2>/dev/null || true
wait $EMULATOR_PID 2>/dev/null || true

exit $TEST_RESULT
