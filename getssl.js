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

    assert.strictEqual(hash.digest('hex'), 'e49a25471eb7265e40103dfa93f4ee18b8f11ec2f8a6e28ad3f46c82fbbda7e3f601337b0c46b8fc10c6bc0f056b5bd2528586a4ec3e56b27b597396732ac9be');

    fs.writeFileSync('openssl.zip', data);

    await (util.promisify(extract)('openssl.zip', { dir: __dirname }));
  }
})();
