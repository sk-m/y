#!/usr/bin/env bash

echo
echo "This script will prepare the environment and perform the first build of the server."
echo "Before continuing, make sure you have the following already installed:"
echo
echo " * make, gcc & standard libs (build-essential package)"
echo " * CMake"
echo " * OpenSSL"
echo " * Boost"
echo " * PostgreSQL's libpq"
echo
echo "You only need to run this script once."
echo

read -n 1 -p "Press any key to start: "

# Prepare config files
cp -n config/credentials.example.yaml config/credentials.yaml

# Get all the libraries we need
git submodule update --recursive --init

# Build fastpbkdf2
cd third_party/fastpbkdf2
make
cd ../..

# make
cmake . && make

echo
echo "If there were no errors reported, the environment is now ready."
echo
echo "Your next steps would be:"
echo " 1. Visit the config folder and update the configuration and credential files."
echo " 2. Import the database schema (dev/sql/y.sql). For example, by running 'psql -h host -d db -u user -L import.log -f y.sql'"
echo
