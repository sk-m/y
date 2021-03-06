--
-- PostgreSQL database dump
--

-- Dumped from database version 13.4
-- Dumped by pg_dump version 13.4

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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: usergroups; Type: TABLE; Schema: public; Owner: y_user
--

CREATE TABLE public.usergroups (
    group_id integer NOT NULL,
    group_name character varying(64) NOT NULL,
    group_display_name character varying(128) NOT NULL,
    group_is_system boolean DEFAULT false NOT NULL
);


ALTER TABLE public.usergroups OWNER TO y_user;

--
-- Name: TABLE usergroups; Type: COMMENT; Schema: public; Owner: y_user
--

COMMENT ON TABLE public.usergroups IS 'User groups that exist on the instance';


--
-- Name: user_groups_group_id_seq; Type: SEQUENCE; Schema: public; Owner: y_user
--

CREATE SEQUENCE public.user_groups_group_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_groups_group_id_seq OWNER TO y_user;

--
-- Name: user_groups_group_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: y_user
--

ALTER SEQUENCE public.user_groups_group_id_seq OWNED BY public.usergroups.group_id;


--
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
-- Name: usergroup_right_options; Type: TABLE; Schema: public; Owner: y_user
--

CREATE TABLE public.usergroup_right_options (
    group_right_relation_id integer NOT NULL,
    right_option character varying(64) NOT NULL,
    option_value text
);


ALTER TABLE public.usergroup_right_options OWNER TO y_user;

--
-- Name: TABLE usergroup_right_options; Type: COMMENT; Schema: public; Owner: y_user
--

COMMENT ON TABLE public.usergroup_right_options IS 'Contains options, set for a specific user right in a specific user group';


--
-- Name: usergroup_rights; Type: TABLE; Schema: public; Owner: y_user
--

CREATE TABLE public.usergroup_rights (
    group_right_relation_id integer NOT NULL,
    group_id integer NOT NULL,
    right_name character varying(64) NOT NULL
);


ALTER TABLE public.usergroup_rights OWNER TO y_user;

--
-- Name: TABLE usergroup_rights; Type: COMMENT; Schema: public; Owner: y_user
--

COMMENT ON TABLE public.usergroup_rights IS 'What rights are assigned to a particular user group';


--
-- Name: usergroup_rights_group_right_relation_id_seq; Type: SEQUENCE; Schema: public; Owner: y_user
--

CREATE SEQUENCE public.usergroup_rights_group_right_relation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.usergroup_rights_group_right_relation_id_seq OWNER TO y_user;

--
-- Name: usergroup_rights_group_right_relation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: y_user
--

ALTER SEQUENCE public.usergroup_rights_group_right_relation_id_seq OWNED BY public.usergroup_rights.group_right_relation_id;


--
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
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: y_user
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: usergroup_rights group_right_relation_id; Type: DEFAULT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.usergroup_rights ALTER COLUMN group_right_relation_id SET DEFAULT nextval('public.usergroup_rights_group_right_relation_id_seq'::regclass);


--
-- Name: usergroups group_id; Type: DEFAULT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.usergroups ALTER COLUMN group_id SET DEFAULT nextval('public.user_groups_group_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: usergroups user_groups_group_name_key; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.usergroups
    ADD CONSTRAINT user_groups_group_name_key UNIQUE (group_name);


--
-- Name: usergroups user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.usergroups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (group_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: usergroup_right_options usergroup_right_options_pkey; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.usergroup_right_options
    ADD CONSTRAINT usergroup_right_options_pkey PRIMARY KEY (group_right_relation_id, right_option);


--
-- Name: usergroup_rights usergroup_rights_group_id_right_name_key; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.usergroup_rights
    ADD CONSTRAINT usergroup_rights_group_id_right_name_key UNIQUE (group_id, right_name);


--
-- Name: usergroup_rights usergroup_rights_pkey; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.usergroup_rights
    ADD CONSTRAINT usergroup_rights_pkey PRIMARY KEY (group_right_relation_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_user_username_key; Type: CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_username_key UNIQUE (user_username);


--
-- Name: user_sessions user_sessions_session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_user_id_fkey FOREIGN KEY (session_user_id) REFERENCES public.users(user_id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: usergroup_right_options usergroup_right_options_group_right_relation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.usergroup_right_options
    ADD CONSTRAINT usergroup_right_options_group_right_relation_id_fkey FOREIGN KEY (group_right_relation_id) REFERENCES public.usergroup_rights(group_right_relation_id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: usergroup_rights usergroup_rights_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: y_user
--

ALTER TABLE ONLY public.usergroup_rights
    ADD CONSTRAINT usergroup_rights_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.usergroups(group_id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- PostgreSQL database dump complete
--

