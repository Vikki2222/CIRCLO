# CIRCLO Project

## Overview
CIRCLO is a full-stack web application demonstrating modern web development practices. This project integrates React frontend with Node.js/Express backend, implements JWT authentication, and includes real-time communication through WebSockets. The project serves as both a functional application and a showcase for type-safe development using TypeScript.

## Key Features
- React component-based frontend architecture
- Node.js/Express backend with REST API endpoints
- JWT-based authentication system with secure token management
- Real-time WebSocket communication
- TypeScript type definitions throughout the codebase
- Dockerized deployment capabilities
- Active development environment with ongoing improvements

## Technologies Used
- **Frontend**: React, TypeScript, Webpack
- **Backend**: Node.js, Express, Redis
- **Authentication**: JSON Web Tokens (JWT), OAuth
- **Database**: In-memory Redis for session management & websockets
- **Build Tools**: npm, Yarn, Webpack
- **Testing**: Jest (planned integration)
- **Deployment**: Docker, Docker Compose

## Project Structure
```
Projects/
└── CIRCLO/
    ├── client/                # React frontend application
    │   ├── public/            # Static assets (images, CSS)
    │   ├── src/                # Source code directory
    │   │   ├── components/     # Reusable UI components
    │   │   ├── pages/          # Page-level components
    │   │   ├── App.tsx         # Application entry point
    │   │   ├── index.tsx       # Main index file
    │   │   └── hooks/          # Custom React hooks
    │   ├── package.json        # Frontend package metadata
    │   └── README.md           # Frontend specific documentation
    │
    ├── server/                # Node.js backend API
    │   ├── server.js           # Entry point
    │   ├── routes/             # API route definitions
    │   │   ├── auth/           # Authentication routes
    │   │   ├── api/            # Core API endpoints
    │   │   └── index.ts        # Route composition
    │   ├── controllers/        # Business logic handlers
    │   ├── utils/              # Helper functions
    │   ├── config/             # Configuration & environment files
    │   ├── package.json        # Backend package metadata
    │   └── README.md           # Backend documentation
    │
    ├── .gitignore             # Version control ignore file
    ├── package.json           # Application dependencies
    ├── .env                    # Environment variables
    └── README.md               # This file (workspace-level documentation)
    ├── .cloudev/               # Claude Code development hooks
    └── CLAUDE.md               # Project description for Claude Code agent
```

## Setup Instructions

### Prerequisites
1. Node.js 18.x+
2. npm 8.x+
3. Redis server (for WebSocket implementation)
4. Basic web development toolchain (editor, Git, etc.)

### Installation Steps
```bash
# Clone the repository
git clone https://github.com/yourusername/circleo.git
cd circleo

# Set up environment variables
cp .env.example .env

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Running the Application
```bash
# Start Redis server (if not already running)
redis-server

# Start the application in development mode
npm run dev

# Or run frontend/backend separately
cd client && npm start
cd ../server && node server.js
```

## Developer Guide

### Backend API
- **Authentication**:
  - POST /auth/register - User registration
  - POST /auth/login - User authentication
  - GET /auth/me - Get user information
- **API Endpoints**:
  - /api/[resource] - Core business endpoints
- **Logout**:
  - POST /auth/logout - Token revocation

### Frontend Architecture
- Component organization follows React's component-based pattern
- TypeScript type definitions enable strict type checking
- Hooks directory contains custom utility hooks
- Assets directory for static resources

## Deployment Options
- Traditional hosting platforms (AWS EC2, DigitalOcean, Heroku)
- Containerized approach using Docker
- Serverless implementations (AWS Lambda, Vercel)
- PaaS solutions (Google App Engine, Render)

## Contributing
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Write documentation updates
5. Submit a pull request for review

## Security Measures
- HTTPS enforced in production
- JWT tokens encrypted with AES-256
- Password hashing using bcrypt
- Rate limiting on authentication endpoints
- Regular dependency security updates

## License
MIT License - view LICENSE for full details

## Contributors
- [Your Name] - Project creator and maintainer
- [Other Contributors] - List of contributors

## Status
The project is under active development with current focus on:
- Frontend user experience enhancements
- Performance optimizations
- Additional API endpoints
- TypeScript implementation in authentication flows