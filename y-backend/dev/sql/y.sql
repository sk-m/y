--
-- PostgreSQL database dump
--

-- Dumped from database version 13.4
-- Dumped by pg_dump version 13.3

-- Started on 2022-03-09 01:32:02

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
-- TOC entry 2 (class 3079 OID 30835)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 3014 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 203 (class 1259 OID 30825)
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: y_user
--

CREATE TABLE public.user_sessions (
    session_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_user_id integer NOT NULL,
    session_current_ip character(15) NOT NULL,
    session_ip_range character(18),
    session_token_hash character(128) NOT NULL,
    session_token_salt character(128) NOT NULL,
    session_token_iterations integer NOT NULL,
    session_device character varying(128),
    session_valid_until timestamp with time zone NOT NULL
);


ALTER TABLE public.user_sessions OWNER TO y_user;

--
-- TOC entry 202 (class 1259 OID 22603)
-- Name: users; Type: TABLE; Schema: public; Owner: y_user
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    user_username character varying(128) NOT NULL,
    user_password character varying(512) NOT NULL,
    user_last_login time with time zone
);


ALTER TABLE public.users OWNER TO y_user;

--
-- TOC entry 201 (class 1259 OID 22601)
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: y_user
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_user_id_seq OWNER TO y_user;

--
-- TOC entry 3015 (class 0 OID 0)
-- Dependencies: 201
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: y_user
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- TOC entry 2870 (class 2604 OID 22606)
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- TOC entry 2877 (class 2606 OID 30829)
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (session_id, session_user_id);


--
-- TOC entry 2873 (class 2606 OID 22611)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 2875 (class 2606 OID 22625)
-- Name: users users_user_username_key; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_username_key UNIQUE (user_username);


--
-- TOC entry 2878 (class 2606 OID 30830)
-- Name: user_sessions user_sessions_session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_user_id_fkey FOREIGN KEY (session_user_id) REFERENCES public.users(user_id);


-- Completed on 2022-03-09 01:32:07

--
-- PostgreSQL database dump complete
--

