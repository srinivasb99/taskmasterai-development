# Testing Note Generation with Firebase Emulator

## Quick Test

1. **Start the emulator** (in one terminal):
```bash
cd /Users/srinibaj/Files/ok
firebase emulators:start --only functions,firestore
```

2. **In another terminal, run the test**:
```bash
cd /Users/srinibaj/Files/ok/functions
node test-emulator.js
```

## Manual Test

1. **Start the emulator**:
```bash
cd /Users/srinibaj/Files/ok
firebase emulators:start --only functions,firestore
```

2. **The emulator UI will be at**: http://localhost:4000

3. **Create a document in Firestore emulator**:
   - Go to http://localhost:4000
   - Navigate to Firestore
   - Create a collection: `noteGenerationProgress`
   - Create a document with ID: `test-note-123`
   - Add fields:
     - `userId`: `test-user-123`
     - `status`: `queued`
     - `progress`: `0`
     - `text`: `Your test text here...`
     - `userTier`: `premium`
     - `noteType`: `personal`
     - `email`: `null`

4. **Watch the function logs** in the emulator terminal

5. **Monitor the document** in Firestore emulator UI - it should update with progress

## Expected Behavior

- Progress should update: 10% → 27% → 45% → 62% → 80% → 85% → 95% → 100%
- Status should change: `queued` → `processing` → `completed`
- Status messages (if generated) should appear in the `statusMessage` field
- No hardcoded status messages should appear
