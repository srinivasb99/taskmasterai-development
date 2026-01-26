# LinkLearn AI

LinkLearn AI - Your AI Study Agent. Elevate your productivity with AI-powered tools for task management, study, organization, and achieving goals.

## Project Overview

LinkLearn is an agentic study platform that helps students transform their learning materials (PDFs, videos, audio) into instant notes, flashcards, and quizzes. The platform features a dynamic AI agent that works with users to provide personalized academic support.

## Project Structure

```
.
├── linklearn-ai/          # Frontend React application
│   ├── src/               # Source code
│   ├── package.json       # Frontend dependencies
│   └── ...
├── functions/             # Firebase Cloud Functions (Backend)
│   ├── src/               # TypeScript source
│   │   └── index.ts       # Main functions entry point
│   ├── package.json       # Backend dependencies
│   └── ...
├── firebase.json          # Firebase configuration
├── .firebaserc            # Firebase project settings
├── storage.rules          # Firebase Storage security rules
└── firestore.indexes.json # Firestore index definitions
```

## Technology Stack

### Frontend
- **React 18** with Vite
- **TypeScript**
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Tiptap** for rich text editing and collaboration
- **Firebase SDK** for authentication and data

### Backend
- **Firebase Cloud Functions** (Node.js 20)
- **TypeScript**
- **Firestore** for database
- **Firebase Storage** for file storage
- **Stripe** for payments
- **Google Gemini API** for AI features
- **OpenAI API** for Sora 2 video generation

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project access

### Installation

1. **Clone the repository** (if applicable)

2. **Install frontend dependencies:**
   ```bash
   cd linklearn-ai
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd functions
   npm install
   ```

4. **Set up environment variables:**
   - Frontend: Create `.env.local` in `linklearn-ai/` directory (see setup guides below)
   - Backend: Configure Firebase Functions secrets (see deployment documentation)

5. **Start the development server:**
   ```bash
   cd linklearn-ai
   npm run dev
   ```

## Available Scripts

### Frontend (linklearn-ai/)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend (functions/)
- `npm run build` - Build TypeScript to JavaScript
- `npm run serve` - Run functions locally with Firebase emulators

## Configuration

### Firebase Setup

The project uses Firebase for:
- **Hosting** - Frontend deployment
- **Cloud Functions** - Backend API
- **Firestore** - Database
- **Storage** - File storage
- **Authentication** - User management

Project ID: `linklearn-ai` (configured in `.firebaserc`)

### Environment Variables

See the following documentation files for detailed setup:
- `linklearn-ai/DEPLOYMENT.md` - Deployment and secrets configuration
- `linklearn-ai/NOTION_EDITOR_SETUP.md` - Tiptap editor setup
- `linklearn-ai/ONLYOFFICE_SETUP.md` - Document server setup (optional)

## Deployment

This project uses **GitHub Actions** for automated CI/CD. All deployments are triggered by pushing to Git.

**Important:** Do not deploy manually. All changes should be committed and pushed to trigger the GitHub Actions workflow.

See `linklearn-ai/DEPLOYMENT.md` for detailed deployment instructions.

## Features

- **AI-Powered Study Assistant** - Dynamic AI agent for personalized learning
- **Note Generation** - Transform PDFs, videos, and audio into structured notes
- **Flashcard Creation** - Generate flashcards from study materials
- **Quiz Generation** - Create quizzes from your content
- **Rich Text Editor** - Notion-like editing experience with Tiptap
- **Real-time Collaboration** - Collaborate on notes with other users
- **File Management** - Upload and organize study materials
- **Payment Integration** - Stripe integration for subscriptions

## Documentation

Additional documentation is available in:
- `linklearn-ai/DEPLOYMENT.md` - Deployment guide
- `linklearn-ai/NOTION_EDITOR_SETUP.md` - Editor setup
- `linklearn-ai/ONLYOFFICE_SETUP.md` - Document server setup
- `EMULATOR_TEST.md` - Firebase emulator testing
- `functions/SORA2_MIGRATION.md` - Sora 2 API migration notes

## License

Private project - All rights reserved
