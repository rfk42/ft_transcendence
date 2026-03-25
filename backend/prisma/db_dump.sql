--
-- PostgreSQL database dump
--

\restrict CCl4e1Uc7EAQxPSNnXfwF0A7ofrFpWhQXPVJfciQ9QIarsFoPE0KmFPbxEMuYxH

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Friend; Type: TABLE; Schema: public; Owner: ludo_user
--

CREATE TABLE public."Friend" (
    id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "userId" text NOT NULL,
    "friendId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Friend" OWNER TO ludo_user;

--
-- Name: Game; Type: TABLE; Schema: public; Owner: ludo_user
--

CREATE TABLE public."Game" (
    id text NOT NULL,
    status text DEFAULT 'waiting'::text NOT NULL,
    "winnerId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "finishedAt" timestamp(3) without time zone
);


ALTER TABLE public."Game" OWNER TO ludo_user;

--
-- Name: GameMove; Type: TABLE; Schema: public; Owner: ludo_user
--

CREATE TABLE public."GameMove" (
    id text NOT NULL,
    "diceValue" integer NOT NULL,
    "pieceIndex" integer NOT NULL,
    "fromPos" integer NOT NULL,
    "toPos" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "gameId" text NOT NULL
);


ALTER TABLE public."GameMove" OWNER TO ludo_user;

--
-- Name: GamePlayer; Type: TABLE; Schema: public; Owner: ludo_user
--

CREATE TABLE public."GamePlayer" (
    id text NOT NULL,
    color text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "userId" text NOT NULL,
    "gameId" text NOT NULL
);


ALTER TABLE public."GamePlayer" OWNER TO ludo_user;

--
-- Name: User; Type: TABLE; Schema: public; Owner: ludo_user
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    "passwordHash" text NOT NULL,
    "avatarUrl" text,
    "twofaEnabled" boolean DEFAULT false NOT NULL,
    "twofaSecret" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO ludo_user;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: ludo_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO ludo_user;

--
-- Data for Name: Friend; Type: TABLE DATA; Schema: public; Owner: ludo_user
--

COPY public."Friend" (id, status, "userId", "friendId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Game; Type: TABLE DATA; Schema: public; Owner: ludo_user
--

COPY public."Game" (id, status, "winnerId", "createdAt", "finishedAt") FROM stdin;
\.


--
-- Data for Name: GameMove; Type: TABLE DATA; Schema: public; Owner: ludo_user
--

COPY public."GameMove" (id, "diceValue", "pieceIndex", "fromPos", "toPos", "createdAt", "gameId") FROM stdin;
\.


--
-- Data for Name: GamePlayer; Type: TABLE DATA; Schema: public; Owner: ludo_user
--

COPY public."GamePlayer" (id, color, "position", "userId", "gameId") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: ludo_user
--

COPY public."User" (id, email, username, "passwordHash", "avatarUrl", "twofaEnabled", "twofaSecret", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: ludo_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
88a3e249-aca9-4dfa-bc06-d1343f33040f	73d4af6239148b17157c80f777138ac403487db36e42a9d9fee1ea0831cbd722	2026-03-23 13:31:46.331252+00	20260323133146_init	\N	\N	2026-03-23 13:31:46.301794+00	1
\.


--
-- Name: Friend Friend_pkey; Type: CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public."Friend"
    ADD CONSTRAINT "Friend_pkey" PRIMARY KEY (id);


--
-- Name: GameMove GameMove_pkey; Type: CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public."GameMove"
    ADD CONSTRAINT "GameMove_pkey" PRIMARY KEY (id);


--
-- Name: GamePlayer GamePlayer_pkey; Type: CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public."GamePlayer"
    ADD CONSTRAINT "GamePlayer_pkey" PRIMARY KEY (id);


--
-- Name: Game Game_pkey; Type: CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Friend_userId_friendId_key; Type: INDEX; Schema: public; Owner: ludo_user
--

CREATE UNIQUE INDEX "Friend_userId_friendId_key" ON public."Friend" USING btree ("userId", "friendId");


--
-- Name: GamePlayer_gameId_color_key; Type: INDEX; Schema: public; Owner: ludo_user
--

CREATE UNIQUE INDEX "GamePlayer_gameId_color_key" ON public."GamePlayer" USING btree ("gameId", color);


--
-- Name: GamePlayer_gameId_userId_key; Type: INDEX; Schema: public; Owner: ludo_user
--

CREATE UNIQUE INDEX "GamePlayer_gameId_userId_key" ON public."GamePlayer" USING btree ("gameId", "userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: ludo_user
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: ludo_user
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Friend Friend_friendId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public."Friend"
    ADD CONSTRAINT "Friend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Friend Friend_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public."Friend"
    ADD CONSTRAINT "Friend_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GameMove GameMove_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public."GameMove"
    ADD CONSTRAINT "GameMove_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GamePlayer GamePlayer_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public."GamePlayer"
    ADD CONSTRAINT "GamePlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GamePlayer GamePlayer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ludo_user
--

ALTER TABLE ONLY public."GamePlayer"
    ADD CONSTRAINT "GamePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict CCl4e1Uc7EAQxPSNnXfwF0A7ofrFpWhQXPVJfciQ9QIarsFoPE0KmFPbxEMuYxH

