#!/bin/bash

. scripts/keycloak-version.sh

$KEYCLOAK/bin/standalone.sh -Dkeycloak.migration.action=export -Dkeycloak.migration.provider=singleFile -Dkeycloak.migration.file=/tmp/keycloak.conf
