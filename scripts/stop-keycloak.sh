#!/bin/bash

. scripts/keycloak-version.sh

${KEYCLOAK}/bin/jboss-cli.sh --connect command=:shutdown
