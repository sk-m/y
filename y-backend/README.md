# Installing & running the backend server

This is a CMake project, make sure you are familliar with the tool.

1. Clone the repo, if not done already.
2. `cd y-backend`
3. `sh init.sh` - this will clone all the necessary submodules, prepare the config files and build the project. It will also give you a list of stuff you need to install before building the project.
4. After a first successfullt build, visit the `config` folder and update config files.
5. Import the SQL file(s) (`dev/sql/y.sql`).
6. Run the server executable.
