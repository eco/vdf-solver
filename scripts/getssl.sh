#! /bin/bash

[[ "${OS}" == "Windows_NT" ]] || exit 0

set -exuo pipefail

echo "Attempting to download OpenSSL binaries"

curl https://bintray.com/vszakats/generic/download_file?file_path=openssl-1.1.1c-win64-mingw.zip --output openssl.zip --location

[[ "$(cat openssl.zip | sha512sum | cut -f 1 -d ' ')" == "b8c79023da19f961107a86b5692ee92fb614e29cb91a59862d0a52095a622ae47967d07ddc2196506819758a27e7834d3605c34a788a482edc45b0f92d6834ac" ]]
unzip openssl.zip
