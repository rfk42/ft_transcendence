# ft_transcendence

ft_transcendence is a full-stack web adaptation of Ludo developed as a 42 school project.
The application combines a custom browser-based board game, authentication, profiles,
friends, avatars, statistics, leaderboards, Docker deployment and multiplayer gameplay.

## Project Description

The goal of the project is to deliver a complete web application with:

- a playable game directly in the browser
- a frontend, a backend and a database
- authentication and user management
- multiplayer interactions between remote users
- containerized deployment with HTTPS

The game implemented in this repository is a Ludo-inspired board game supporting solo play,
remote multiplayer, and games with more than two players.

## Team Members And Roles

### Rafik Hamini

- Product Owner
- Frontend Tech Lead
- Developer

### Noe Lambert

- Product Manager
- Backend Tech Lead
- Developer

### Akim Hamini

- Developer

### Ilan Sadi

- Developer

## Project Management Approach

The project was organized as a collaborative team effort with clear ownership areas:

- Rafik led the game experience, gameplay rules and game frontend.
- Noe led the backend architecture, authentication, persistence and API design.
- Akim focused on user-facing account features, profiles, friends, leaderboard and OAuth frontend flows.
- Ilan focused on multiplayer synchronization by polling, room-related user flow, and legal/documentation work.

Our workflow was based on:

- feature ownership per teammate
- shared integration inside one full-stack repository
- Git-based collaboration with separate commits by multiple contributors
- iterative testing of frontend/backend integration
- progressive enrichment of the product from mandatory architecture to multiplayer and platform features

## Repository Structure

```text
ft_transcendence/
├── backend/
├── db/
├── frontend/
├── nginx/
├── docker-compose.yml
└── README.md
```

## Technical Stack And Justifications

### Frontend

- React
  Used to structure the UI with reusable components and state-driven rendering.
- Vite
  Used for fast local development and frontend build performance.
- SCSS
  Used to build a custom styling system with reusable classes, shared colors and responsive layouts.
- React Router
  Used for page navigation, protected routes and legal/profile/game screens.

### Backend

- Node.js
  Used as the JavaScript runtime for the API server.
- Express
  Used as the backend framework for authentication, friends, uploads, game routes and room actions.
- Prisma
  Used as ORM to access PostgreSQL through a typed data layer.
- JWT
  Used to authenticate users securely across protected routes.
- Multer
  Used for avatar and file upload handling.

### Database

- PostgreSQL
  Used as the relational database for users, games, friendships, match history and statistics.

### Infrastructure

- Docker
  Used to containerize the full stack.
- Docker Compose
  Used to launch the whole application with one command.
- Nginx
  Used as reverse proxy and HTTPS entrypoint.

## Deployment

### Prerequisites

- Docker
- Docker Compose

### Environment Setup

Create the environment file from the example:

```bash
cp .env.example .env
```

Fill in the required secrets before running the stack.

### Run The Full Application

```bash
docker compose up --build
```

Once the containers are ready, the application is available through Nginx:

- HTTPS: `https://localhost:8443`
- HTTP: `http://localhost:8080`

## Vercel Deployment

The repository is prepared for internet deployment on Vercel with:

- static frontend build served from `frontend/dist`
- one Express API entrypoint exposed through `api/index.js`
- Prisma/PostgreSQL persistence
- private blob-backed upload storage when `BLOB_READ_WRITE_TOKEN` is configured
- database-backed multiplayer room state so rooms do not rely on process memory

### Required Vercel Environment Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `ALLOWED_ORIGINS`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `FT_CLIENT_ID`
- `FT_CLIENT_SECRET`
- `FT_REDIRECT_URI`
- `BLOB_READ_WRITE_TOKEN`

### Deployment Notes

- The root `vercel.json` config builds the Vite frontend and routes `/api/*` to the Express backend.
- The root `vercel-build` script runs `prisma generate`, `prisma db push`, and the frontend production build.
- Avatar and file uploads use durable storage through Vercel Blob in production.
- Multiplayer rooms are persisted in PostgreSQL and no longer depend on in-memory state.

## Architecture Components

The project contains the three required parts:

- Frontend: React client in `frontend/`
- Backend: Express API in `backend/`
- Database: PostgreSQL with Prisma schema in `backend/prisma/schema.prisma`

## Database Schema

The database is centered around five main entities:

- `User`
  Stores account identity, credentials, avatar, OAuth identifiers and online status.
- `Friend`
  Stores friend relationships and request status between users.
- `Game`
  Stores a game session and its lifecycle (`waiting`, `playing`, `finished`).
- `GamePlayer`
  Links users to a game with assigned color and participation metadata.
- `UserStats`
  Stores player statistics such as wins, losses, win rate, total moves and rank.
- `MatchHistory`
  Stores historical information about finished matches.

### Relationship Summary

- One `User` can send and receive many `Friend` relations.
- One `User` can participate in many `GamePlayer` entries.
- One `Game` has many `GamePlayer` entries.
- One finished `Game` can have one `MatchHistory`.
- One `User` has one `UserStats` record.

## Core Features

- Play a complete Ludo-inspired web game in the browser.
- Animate pawn movement step by step across the board.
- Handle turn order, dice rolls, captures, home lanes and victory conditions.
- Create multiplayer rooms for 2, 3 or 4 players.
- Join a room from another client using a room code.
- Synchronize remote matches with polling.
- Support authentication with username/password and OAuth.
- Allow players to edit profile information and upload avatars.
- Provide friends list, friend requests and profile pages.
- Display game statistics, match history and leaderboard data.
- Provide legal pages accessible from the footer.

## Features And Ownership

### Rafik Hamini

- Designed and implemented the game board frontend.
- Built the gameplay rules, movement logic and overall game behavior.
- Implemented the Ludo board rendering and movement animation pipeline.
- Worked on the overall frontend architecture of the game experience.

### Noe Lambert

- Built the backend architecture and API structure.
- Integrated PostgreSQL with Prisma.
- Implemented authentication backend logic.
- Implemented the friends backend.
- Added file upload handling and rate limiting protections.

### Akim Hamini

- Implemented OAuth frontend integration and callback flow.
- Built the login and registration frontend.
- Built the profile and player profile pages.
- Built the leaderboard frontend.
- Built the friend addition frontend and footer navigation.

### Ilan Sadi

- Implemented the polling logic for multiplayer synchronization.
- Helped integrate remote multiplayer behavior.
- Worked on legal pages content and project documentation.

## Individual Contributions

### Rafik Hamini

- Main game frontend implementation
- Pawn movement logic
- Board configuration and animation flow
- Multiplayer board display integration

### Noe Lambert

- Express backend structure
- Prisma database integration
- JWT authentication backend
- Friends routes and backend protections

### Akim Hamini

- OAuth frontend integration
- Login and register frontend
- Profile UI and player profile UI
- Leaderboard and social pages

### Ilan Sadi

- Multiplayer polling and room synchronization
- Multiplayer support contribution
- Privacy Policy, Terms of Service and README improvements

## Chosen Modules And Point Calculation

The following modules are implemented and claimed for evaluation.

| Module | Type | Points | Justification |
|---|---:|---:|---|
| Use a framework for both frontend and backend | Major | 2 | Frontend uses React and backend uses Express. |
| Use an ORM for the database | Minor | 1 | Prisma is used as ORM for PostgreSQL. |
| Support for additional browsers | Minor | 1 | The application is designed and tested to run beyond Chrome, notably Firefox and Edge, with documented local HTTPS trust constraints. |
| Complete web-based game where users can play against each other | Major | 2 | The repository contains a full browser game with rules, turns, captures and victory conditions. |
| Custom-made design system with reusable components | Minor | 1 | The frontend uses SCSS, shared color variables, reusable components and a reusable icon set. |
| Standard user management and authentication | Major | 2 | Users can register, log in, edit profile data, upload avatars and manage friendships. |
| Game statistics and match history | Minor | 1 | User stats, match history and leaderboard integration are implemented. |
| Remote authentication with OAuth 2.0 | Minor | 1 | Google and 42 OAuth flows are implemented. |
| Allow users to interact with other users | Major | 2 | Friends, profile viewing and room chat are implemented. |
| File upload and management system | Minor | 1 | Avatar upload uses client and server validation with progress indication. |
| Remote players on separate computers | Major | 2 | Multiplayer rooms support remote play through room synchronization and polling. |
| Multiplayer game with more than two players | Major | 2 | Multiplayer rooms support 2, 3 and 4 players. |

### Total Claimed Module Points

`18 points`

## Module Justifications In Detail

### Major: Framework For Frontend And Backend

- React is used to build the frontend application.
- Express is used to structure the backend API.
- This provides clear separation of concerns and reusable architecture on both sides.

### Minor: ORM

- Prisma is used to model the schema and perform database queries.
- It gives a structured relational model for users, games, friendships and statistics.

### Minor: Additional Browser Support

- The project is intended to run on Chrome, Firefox and Edge.
- Browser-specific attention points mainly concern local HTTPS trust with self-signed certificates and OAuth callbacks during development.

### Major: Complete Web-Based Game

- The Ludo game has board rules, movement logic, active turns and a winner state.
- Remote players can play the same match through the multiplayer system.

### Minor: Custom-Made Design System

The project includes reusable UI building blocks and visual tokens such as:

- shared SCSS color palette
- consistent typography hierarchy
- reusable page cards and panels
- reusable form controls
- reusable footer/header layout
- reusable route protection component
- reusable game board parts
- reusable room chat component
- reusable dice icons
- reusable music and pawn icons

Examples of reusable components:

- `Header`
- `Footer`
- `ProtectedRoute`
- `AuthForm`
- `TargetGroup`
- `CenterTargets`
- `PawnOverlay`
- `RoomChat`
- `PlayerBadge`
- `VictoryOverlay`

### Major: Standard User Management And Authentication

- Register and login forms are implemented.
- Passwords are hashed server-side.
- Users can edit profile information.
- Users can upload avatars.
- Users can add friends and see online status.
- Each user has a profile page.

### Minor: Game Statistics And Match History

- User statistics are stored and displayed.
- Match history is displayed on profile pages.
- Leaderboard data is generated from recorded statistics.

### Minor: OAuth 2.0

- Google OAuth login is implemented.
- 42 OAuth login is implemented.
- Callback handling restores the authenticated session on the frontend.

### Major: User Interactions

- Players can view profiles.
- Players can add and remove friends.
- Players can interact inside multiplayer rooms through chat.

### Minor: File Upload And Management

- Avatar upload supports controlled file types.
- File size is validated.
- Upload progress is shown in the UI.
- Secure authenticated upload routes are used.

### Major: Remote Players

- Players can create and join rooms from different clients.
- The backend remains authoritative for room state.
- The frontend synchronizes the state through polling.

### Major: Multiplayer More Than Two Players

- Rooms support 2, 3 and 4 players.
- Turn order and active players are handled according to room size.
- Synchronization works across all connected clients.

## Browser Support Notes

Supported target browsers:

- Google Chrome
- Mozilla Firefox
- Microsoft Edge

Known limitation during local development:

- self-signed HTTPS certificates may need to be manually trusted depending on the browser and operating system
- OAuth callbacks also depend on the local HTTPS environment being trusted

## Security Notes

- Secrets are expected in `.env` and documented in `.env.example`.
- Passwords are hashed with bcrypt before storage.
- JWT is used on protected routes.
- Rate limiting is enabled on the backend.
- Upload handling validates file type and file size.

## Legal Pages

The application provides:

- `Legal Notice`
- `Privacy Policy`
- `Terms of Service`

These pages are accessible from the footer and contain project-specific content.

## Final Notes

This repository was developed in a school context and reflects a team effort across frontend,
backend, multiplayer synchronization, user features and deployment.
