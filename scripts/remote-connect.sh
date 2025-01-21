#!/bin/bash

set -e

remote_name=$1

source "$(dirname "$0")/remote-source.sh"

ssh -i "$remote_pem_file" "$REMOTE_USER@$REMOTE_IP"
