const crypto = require('crypto');
const fs = require('fs');
const assert = require('assert');
const util = require('util');
const rp = require('request-promise-native');
const extract = require('extract-zip');
const rimraf = require('rimraf');

(async () => {
  if (process.platform === 'win32') {
    rimraf.sync('openssl.zip');
    rimraf.sync('openssl-1.1.1d-win64-mingw');

    const data = await rp({
      uri: 'https://bintray.com/vszakats/generic/download_file?file_path=openssl-1.1.1d-win64-mingw.zip',
      encoding: null,
    });

    const hash = crypto.createHash('sha256');
    hash.update(data, 'binary');

    assert.strictEqual(hash.digest('hex'), '74106c80ac74a7be49174593578a587be1b3e2efdc3a29e865945f07ada623f2');

    fs.writeFileSync('openssl.zip', data);

    await (util.promisify(extract)('openssl.zip', { dir: __dirname }));
  }
})();
