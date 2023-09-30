#!/bin/sh
case "$OSTYPE" in
  solaris*) machine=SOLARIS;;
  darwin*)  machine=OSX;; 
  linux*)   machine=LINUX;;
  bsd*)     machine=BSD;;
  msys*)    machine=WINDOWS;;
  *)        machine=unknown;;
esac

if [ ! $machine == "OSX" ]; then
    echo "You are not using OSX"
    exit 1
fi

if [ ! -d "/Applications/MuseScore 3.app" ]; then
    echo "MuseScore 3 is not installed"
    exit 1
fi
docker-compose build
docker-compose up -d
if [ ! $? -eq 0 ]; then
    echo "The docker compose command has failed"
    exit 1
fi

open -a "MuseScore 3"
if [ ! $? -eq 0 ]; then
    echo "Cannot start MuseScore 3"
    exit 1
fi