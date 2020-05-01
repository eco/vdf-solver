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
    rimraf.sync('openssl-1.1.1g-win64-mingw');

    const data = await rp({
      uri: 'https://bintray.com/vszakats/generic/download_file?file_path=openssl-1.1.1g-win64-mingw.zip',
      encoding: null,
    });

    const hash = crypto.createHash('sha256');
    hash.update(data, 'binary');

    assert.strictEqual(hash.digest('hex'), '61f2dbe1ba7cc5742f0b8492288cfcb2df2e40178e28eb3645dd073785bfb258');

    fs.writeFileSync('openssl.zip', data);

    await (util.promisify(extract)('openssl.zip', { dir: __dirname }));
  }
})();
