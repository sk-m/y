# y

## Installing y (production environment)

y comes in two parts: a _server_ and _web distribution_.

You can download the latest version of y on the [releases](https://github.com/sk-m/y/releases) page.

### 1. Prerequisites

y does not install anything on your machine, so make sure you have everything required for it to run:

1. A linux machine.
2. PostgreSQL (version 16.0 or higher).
3. A web server (nginx/apache/etc.).
4. Required packages: `apt install fuse3`.

#### _Optional_ dependencies for the "storage" feature

1. `imagemagick` - thumbnail generation.
2. `ffmpeg` - video transcoding, thumbnail generation.
3. `ffprobe` (usually comes with `ffmpeg`).

### 2. Setting up PostgreSQL

After installing PostgreSQL and initializing your database cluster (see postgresql documentation for your distro), do the following:

1. Launch `psql` (you might need to log in as the `postgres` user first - `sudo su - postgres`)
2. Create a database for y: `CREATE DATABASE y;`
3. Create a user: `CREATE USER y_user WITH PASSWORD 'passw0rd!';`
4. Grant required privileges to that user: `GRANT ALL PRIVILEGES ON DATABASE "y" to y_user;`
5. Set that user as the owner of the database: `ALTER DATABASE y OWNER TO y_user;`

### 3. Installing y server

Create a new folder, for example, `/etc/y`, `/var/y`, etc., and unzip the archive you have downloaded into there. The path is not important, but it's a good idea to treat y as a separate program that has it's own location and does not reside in your user's home folder. If you set up y-server as a service, this path will be written into the service definition, so make sure you choose a path you like and don't move it after you set it up.

Edit the default `.env` file and update it according to your setup. Make sure that `DATABASE_URL` is set correctly, everything else should be fine by default. If you have _first_ unzipped y's package somewhere else and _only then_ copied the files into it's intended folder, make sure you also copied the `.env` file. It's easy to miss it, `ls` might not show it because its prefixed with a dot.

y's server is, for the most part, just one binary file. You can either just run it from a cli, or you can set it up as a service, which would be a more long-term soultion:

- to set up y-server as a service, run the `./install.sh` script (recommended).
- to start the server from a cli, just run `./y-server`.

That's it. y's only configuration file is `.env`, everything else can be configured using the web ui. If you have ran the install script and set y up as a service, it can be started using `systemctl start y-server`. To make the server start automatically on boot, run `systemctl enable y-server`.

### 4. Serving web files

_y server_ does **not** serve y's web files, so you will have to use a web server for that.

The next section is written for _nginx_, but you can use any web server you like.

1. Install _nginx_.
2. Create a new site configuration, based on the default one: `cp /etc/nginx/sites-available/default /etc/nginx/sites-available/y`
3. Edit `/etc/nginx/sites-available/y`:

```text
server {
    # y's example server config

    server_name _;
    listen 80 default_server;

    # Replace with the path to your www folder (directly inside your y folder):
    root /var/y/www;

    index index.html;

    location / {
            try_files $uri $uri/ /index.html;
    }

    location /api/ {
            proxy_pass http://localhost:8080;
            proxy_set_header Host $host;
    }

    # If you are planning on using the "storage" feature,
    # increase max body size to allow clients upload larger files
    client_max_body_size 1000M ; # 1G example
}
```

4. Enable the site `ln -s /etc/nginx/sites-available/y /etc/nginx/sites-enabled/y`
5. Restart _nginx_

### 5. Logging in & basic configuration

If you've done everything correctly, you should be able to open y in your browser and log in with the default admin user:

- username: `admin`
- password: `admin`

After logging in, don't forget to change admin user's password on the `/admin/users` page!

Default configuration also comes with a simple `admin` user group, which is assigned to the `admin` user. Make sure you update that group's rights on the `/admin/user-groups` page according to your needs. Also, don't forget to assign the "Toggle features" right, otherwise you won't be able to enable any of y's features, such as "storage".

## Trying out y (development environment)

1. Install _PostgreSQL_ and set it up like explained in the "**Installing y (production environment)**" section.
2. Install _NodeJS_, _pnpm_ and _Rust_.
3. Clone the repo: `git clone https://github.com/sk-m/y.git`
4. _(optional)_ Switch to the branch you are interested in (ex. `git checkout development`).
5. Start the server:

   1. `cd y/y-server`
   2. `cp .env.example .env`
   3. update `.env` according to your setup
   4. `cargo run`

6. Start up the frontend:

   1. `cd y/y-web`
   2. `pnpm install`
   3. `pnpm run dev`

## Footnotes

[Support Ukraine](https://u24.gov.ua/)
