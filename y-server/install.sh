#!/bin/bash

echo "This script will set up a service for y-server and create a `y-server` user acccount."
echo
echo "This directory ($(pwd)) will be set as the working directory for y."
echo "Please make sure to move y-server's files to a desired location before continuing."

if [ "$(id -u)" -ne 0 ]; then
  echo
  echo "Warning: This script should be run as root!"
fi

echo
read -p "Press enter to start: "

service_definition="[Unit]
Description=y server
Before=postgresql.service

[Install]
WantedBy=default.target

[Service]
User=y-server
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/y-server
"

id -u y-server
if [ $? -ne 0 ]; then
    echo "Creating a `y-server` user..."
    sudo useradd -r -M -s /bin/bash -d $(pwd) -c "Project 'y' user" y-server
fi

echo "Writing service definition..."
echo "$service_definition" > /etc/systemd/system/y-server.service
systemctl daemon-reload

echo
echo "Service written to /etc/systemd/system/y-server.service"
echo
echo "To start y-server, run 'systemctl start y-server'"
echo "You can also make y-server start on boot with 'systemctl enable y-server'"