#! /usr/bin/env bash

# Script for creating a test CA. The output here is intended to be checked in,
# so this script is more like documentation in case we need to regenerate it
# later. Made from instructions at:
# http://engineering.circle.com/https-authorized-certs-with-node-js/.
# The .cnf files in this directory are also inputs, but everything else is
# generated.

set -e -u -o pipefail

cd "$(dirname "$BASH_SOURCE")"

# Create two CAs, a good one and a bad one. The only difference between the two
# is that all test clients will expect the good one, and when we want to test
# the failure case we'll have the test server use the bad one.
for virtuousness in good bad ; do
  mkdir -p "./$virtuousness"
  openssl req -new -x509 -days 9999 -config ca.cnf \
    -keyout "$virtuousness/ca-key.pem" -out "$virtuousness/ca-crt.pem"
  openssl genrsa -out "$virtuousness/server-key.pem" 4096
  openssl req -new -config server.cnf -key "$virtuousness/server-key.pem" \
    -out "$virtuousness/server-csr.pem"
  openssl x509 -req -extfile server.cnf -days 999 -passin "pass:password" \
    -in "$virtuousness/server-csr.pem" -CA "$virtuousness/ca-crt.pem" \
    -CAkey "$virtuousness/ca-key.pem" -CAcreateserial \
    -out "$virtuousness/server-crt.pem"
done
