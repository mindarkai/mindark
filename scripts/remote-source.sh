if [ "$remote_name" == "" ]; then
    echo "remote_name not given"
    exit 1
fi

remote_config_file="$(dirname "$0")/../remote/$remote_name/.env.remote.$remote_name"

if [ ! -f "$remote_config_file" ]; then
    echo "instance($remote_name) config file not found - $remote_config_file"
    exit 1
fi

remote_pem_file="$(dirname "$0")/../remote/$remote_name/$remote_name.pem"

if [ ! -f "$remote_pem_file" ]; then
    echo "pem file for instance($remote_name) not found - $remote_pem_file"
    exit 1
fi

set -o allexport

source "$remote_config_file"

set +o allexport
