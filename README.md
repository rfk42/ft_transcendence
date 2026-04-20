# ft_transcendence

ft_transcendence is a full-stack web adaptation of Ludo developed as a 42 school project. The application combines a custom game board experience, authentication flows, player profiles, leaderboards, friends, avatars, database persistence and multiplayer polling.

## Project Overview

The project is split into several parts:

- `frontend/`: React + Vite client application.
- `backend/`: Express API handling authentication, profiles, friends, uploads and game-related endpoints.
- `db/`: PostgreSQL container setup.
- `nginx/`: reverse proxy and HTTPS entrypoint.
- `docker-compose.yml`: local orchestration for the complete stack.

## Core Features

- Playable Ludo-inspired game experience in the browser.
- Custom game engine covering movement rules, turn logic and board behavior.
- Multiplayer support powered by polling.
- User registration and login.
- OAuth authentication.
- Player profile and friend profile pages.
- Friends system with friend addition flows.
- Leaderboard interface.
- Avatar upload support.
- Rate limiting and backend security controls.
- HTTPS access through Nginx in Docker.

## Team Roles And Contributions

### Rafik Hamini

- Product Owner.
- Frontend Tech Lead.
- Developer.
- Designed and implemented the full game frontend.
- Built the game engine and handled the gameplay rules, movement logic and overall game behavior.
- Contributed to the overall product direction and frontend architecture.

### Noe Lambert

- Product Manager.
- Backend Tech Lead.
- Developer.
- Built the backend architecture and database integration.
- Implemented the friends system.
- Implemented the authentication system.
- Added file upload handling.
- Added rate limiting and backend-side protection mechanisms.

### Akim Hamini

- Developer.
- Implemented the OAuth integration.
- Built the frontend for friend addition.
- Built the profile and friend profile interfaces.
- Built the login frontend.
- Built the leaderboard frontend.
- Built the footer.

### Ilan Sadi

- Developer.
- Implemented the polling logic used for multiplayer behavior.
- Helped make the game multiplayer.
- Worked on improving and rectifying the `Privacy Policy`, `Terms of Service` and project README.

## Technical Stack

### Frontend

- React
- Vite
- SCSS
- React Router

### Backend

- Node.js
- Express
- Prisma
- PostgreSQL
- JWT authentication
- Multer for file uploads
- OAuth integrations

### Infrastructure

- Docker
- Docker Compose
- Nginx

## Local Development

### Prerequisites

- Docker
- Docker Compose

### Environment

Create your environment file from the provided example and fill in the required secrets:

```bash
cp .env.example .env
```

### Run The Project

```bash
docker compose up --build
```

Once the containers are up, the application is exposed through Nginx:

- HTTPS: `https://localhost:8443`
- HTTP: `http://localhost:8080`

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

## Legal Pages

The frontend includes dedicated legal pages for:

- `Legal Notice`
- `Privacy Policy`
- `Terms of Service`

These pages are available from the application footer.

## Notes

This repository was developed in a school context and may continue to evolve as features are refined, documented and stabilized.