#!/bin/sh
case "$OSTYPE" in
  solaris*) machine=SOLARIS;;
  darwin*)  machine=OSX;; 
  linux*)   machine=LINUX;;
  bsd*)     machine=BSD;;
  msys*)    machine=WINDOWS;;
  *)        machine=unknown;;
esac

print $machine

if [ ! $machine == "OSX" ]; then
    echo "You are not using OSX"
    exit 1
fi

Application="/Applications/MuseScore 3.app"
if [ ! -d $Application ]; then
    echo "MuseScore 3 is not installed"
    exit 1
fi

docker-compose up -d --build
open -a "MuseScore 3"