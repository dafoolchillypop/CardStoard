#!/bin/bash

docker-compose down -v

sleep 3

docker-compose build

sleep 3

docker-compose up
