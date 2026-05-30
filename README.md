# Hindu QnA

A full-stack Q&A platform for Hinduism, Sanatan Dharma, and related topics. Built with the MERN stack, featuring guru/scholar verification, AI-powered answers, and Stack Exchange-style features.

## Features

### Core Q&A
- Ask and answer questions with Markdown support
- Upvote/downvote system
- Comments on questions and answers
- Tags for categorization
- Search and filtering

### Guru/Scholar System
- Separate login portal for gurus
- Three tiers: Scholar → Guru → Acharya
- Verify answers with "Guru Verified" badge
- Featured answers by gurus

### Reputation & Privileges
- Earn reputation through upvotes and accepted answers
- Unlock privileges as reputation grows
- Badge system (Bronze, Silver, Gold)

### AI Assistant
- OpenAI GPT-4 powered chatbot
- Semantic search for related questions
- Shlokas formatted in code blocks
- Scripture citations

### Additional Features
- Bounties for answers
- Review queues for moderation
- User profiles with activity
- Bookmarks/favorites

## Tech Stack

- **Frontend:** React.js, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Auth:** Google OAuth, GitHub OAuth
- **AI:** OpenAI API

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd hindu-qna
```

2. Install server dependencies
```bash
cd server
npm install
```

3. Install client dependencies
```bash
cd ../client
npm install
```

4. Create `.env` file in server directory
```bash
cp .env.example .env
# Edit .env with your credentials
```

5. Start development servers
```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm start
```

## Environment Variables

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hindu-qna
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
OPENAI_API_KEY=your_openai_api_key
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/guru-login` - Guru login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/github` - GitHub OAuth

### Questions
- `GET /api/questions` - Get all questions
- `POST /api/questions` - Create question
- `GET /api/questions/:id` - Get question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/questions/:id/vote` - Vote on question
- `POST /api/questions/:id/accept/:answerId` - Accept answer

### Answers
- `POST /api/answers/:questionId` - Create answer
- `PUT /api/answers/:id` - Update answer
- `DELETE /api/answers/:id` - Delete answer
- `POST /api/answers/:id/vote` - Vote on answer

### Guru
- `GET /api/guru/dashboard` - Guru dashboard
- `GET /api/guru/pending` - Pending verifications
- `POST /api/guru/verify/:answerId` - Verify answer

### AI
- `POST /api/ai/chat` - Chat with AI
- `GET /api/ai/history/:sessionId` - Get chat history

## License

MIT
