# CIRCLO

CIRCLO is a location-based meetup app. People create meetups that appear as pins on a map, find and join meetups nearby, and chat with other attendees in real time. Hosts can edit or cancel their meetups and remove attendees.

## Tech stack

- **Frontend** (`frontend/`): React 19 (Create React App), React Router 7, Leaflet / react-leaflet, axios, socket.io-client
- **Backend** (`backend/`): Node.js, Express 4, MongoDB with Mongoose (geospatial `2dsphere` queries), Socket.IO
- **Auth:** Passport with email/password (bcrypt) and Google OAuth 2.0; issues JWTs
- **Security and ops:** helmet, CORS, express-rate-limit, express-mongo-sanitize, compression, morgan and winston logging

## Project structure

```
CIRCLO/
├── backend/
│   ├── server.js              # Entry point: connects to MongoDB, starts HTTP and Socket.IO
│   └── src/
│       ├── app.js             # Express app, middleware, route mounting
│       ├── config/            # db, env validation, passport strategies
│       ├── routes/            # auth.routes.js, meetup.routes.js
│       ├── controllers/       # auth, meetup, join, chat
│       ├── services/          # business logic per controller
│       ├── models/            # User, Meetup, Message (Mongoose)
│       ├── middleware/        # protect (JWT), rate limiters, error handler
│       ├── socket/            # Socket.IO setup and event emitter
│       └── utils/             # AppError, catchAsync, jwt, logger
└── frontend/
    └── src/
        ├── pages/             # Map, CreateMeetup, Login, Register, AuthCallback
        ├── components/        # MeetupPanel, MeetupPin, ChatDrawer, ProtectedRoute
        ├── api/               # axios instance and auth / meetup / chat API calls
        ├── context/           # AuthContext, SocketContext
        ├── hooks/             # useNearbyMeetups
        └── utils/             # Leaflet icon setup
```

## Getting started

### Prerequisites

- Node.js 18+ and npm
- A MongoDB instance (local or Atlas)
- Google OAuth credentials (the backend requires them at startup)

### Backend

Create `backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/circlo
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
CLIENT_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

The first six variables are required; the server will not start without them.

```bash
cd backend
npm install
npm run dev      # nodemon; or `npm start`
```

The API runs at `http://localhost:5000`. You can check it at `GET /health`.

### Frontend

```bash
cd frontend
npm install
npm start
```

The app runs at `http://localhost:3000`. By default it calls `http://localhost:5000/api/v1` and connects its socket to `http://localhost:5000`. To change these, set `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` in `frontend/.env`.

## API

All routes are under `/api/v1`. Routes marked 🔒 need an `Authorization: Bearer <token>` header.

### Auth: `/api/v1/auth`

| Method | Path | Description |
|---|---|---|
| POST | `/register` | Register with email and password |
| POST | `/login` | Log in, returns a JWT |
| GET | `/google` | Start Google OAuth |
| GET | `/google/callback` | OAuth callback; redirects to the frontend `/auth/callback` |
| GET | `/me` 🔒 | Current user |

### Meetups: `/api/v1/meetups`

| Method | Path | Description |
|---|---|---|
| GET | `/nearby` | Meetups near a point (public). Query: `lng`, `lat`, `radius`, `category`, `page`, `limit` |
| POST | `/` 🔒 | Create a meetup |
| GET | `/my` 🔒 | Meetups you host |
| GET | `/joined` 🔒 | Meetups you joined |
| GET | `/:id` 🔒 | Meetup details |
| PATCH | `/:id` 🔒 | Update a meetup (host) |
| DELETE | `/:id` 🔒 | Delete a meetup (host) |
| POST | `/:id/join` 🔒 | Join |
| POST | `/:id/leave` 🔒 | Leave |
| DELETE | `/:id/attendees/:userId` 🔒 | Remove an attendee (host) |
| GET | `/:id/messages` 🔒 | Chat history |

### Socket.IO events

Connections must send a JWT, either as `auth.token` in the handshake or as an `Authorization` header.

- **Client → server:** `meetup:join_room`, `meetup:leave_room`, `chat:message` `{ meetupId, text }`
- **Server → client:** `meetup:joined_room`, `chat:message`, `chat:error`, `meetup:attendee_update`, `meetup:full`, `meetup:reopened`, `meetup:cancelled`

## Testing

There are no backend tests yet. The frontend only has the default Create React App test (`cd frontend && npm test`).

## Status

Under active development.
