# y

## Installing y (production environment)

y comes in two parts: a _server_ and _web distribution_.

You can download the latest version of y on the [releases](https://github.com/sk-m/y/releases) page.

### 1. Prerequisites

In order to set up y on your server, you will first need:

1. A linux machine.
2. PostgreSQL (version 16.0 or higher).
3. A web server (nginx/apache/etc.).

"Storage" feature _optional_ dependencies:

1. `imagemagick` - thumbnail generation for image files.
2. `ffmpeg` - thumbnail generation for video files.

### 2. Setting up PostgreSQL

After installing postgresql and initializing your database cluster (see postgresql documentation), do the following:

1. Launch `psql` (you might need to log in as the `postgres` user first - `sudo su - postgres`)
2. Create a database for y: `CREATE DATABASE y;`
3. Create a user: `CREATE USER y_user WITH PASSWORD 'passw0rd!';`
4. Grant required privileges to that user: `GRANT ALL PRIVILEGES ON DATABASE "y" to y_user;`
5. Set that user as the owner of the database: `ALTER DATABASE y OWNER TO y_user;`

### 3. Installing y server

_y server_ is, for the most part, just one binary file. You can either run it from a cli, if you want to test it out first, or set up a service for it, which is a more long-term soultion.

Before starting the server, edit the `.env` file and update it according to your setup. You mainly want to make sure that the `DATABASE_URL` variable is correct, everything else should be fine by default. Then,

- to start the server from a cli, just run `./y-server`, or
- to set up y-server as a service, run the `./install.sh` script.

### 4. Serving web files

_y server_ does **not** serve y's web files, so you will have to use a web server for that.

The next section is written for **nginx**, but you can use any web server you like.

1. Install **nginx**.
2. Copy y's `www` folder anywhere you like, those files will be hosted by **nginx**.
3. Add the following configuration to your `/etc/nginx/nginx.conf`:

```text
server {
    # Example server config:
    server_name localhost;
    listen 80;

    # Replace with the path to your www folder:
    root /usr/share/nginx/y/www;

    index index.html;

    location / {
            try_files $uri $uri/ /index.html;
    }

    location /api/ {
            proxy_pass http://localhost:8080;
            proxy_set_header Host $host;
    }
}
```

Don't forget to restart **nginx** after updating `ninx.conf`.

### 5. Logging in

If you've done everything correctly, you should be able to open y in your browser and log into a default admin user:

- username: `admin`
- password: `admin`

## Trying out y (development environment)

Setting up a development environment should be very straightforward.

1. Install PostgreSQL and set it up using a tutorial in the "**Installing y (production environment)**" section.
2. Install **NodeJS**, **pnpm** and **Rust**.
3. Clone the repo: `git clone https://github.com/sk-m/y.git`
4. Start the server:

   1. `cd y/y-server`
   2. `cp .env.example .env`
   3. update `.env` according to your setup
   4. `cargo run`

5. Start up the frontend:

   1. `cd y/y-web`
   2. `pnpm install`
   3. `pnpm run dev`

## Footnotes

[Support Ukraine](https://u24.gov.ua/)
