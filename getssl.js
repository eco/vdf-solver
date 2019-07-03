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
    rimraf.sync('openssl-1.1.1c-win64-mingw');

    const data = await rp({
      uri: 'https://bintray.com/vszakats/generic/download_file?file_path=openssl-1.1.1c-win64-mingw.zip',
      encoding: null,
    });

    const hash = crypto.createHash('sha512');
    hash.update(data, 'binary');

    assert.strictEqual(hash.digest('hex'), 'b8c79023da19f961107a86b5692ee92fb614e29cb91a59862d0a52095a622ae47967d07ddc2196506819758a27e7834d3605c34a788a482edc45b0f92d6834ac');

    fs.writeFileSync('openssl.zip', data);

    await (util.promisify(extract)('openssl.zip', { dir: __dirname }));
  }
})();
