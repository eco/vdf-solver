const crypto = require('crypto');
const fs = require('fs');
const assert = require('assert');
const util = require('util');
const rp = require('request-promise-native');
const extract = require('extract-zip');
const rimraf = require('rimraf');

const expected = '90e9f7209015dd95e5e260ebed4234e687a9292ab4b2cccb75e16abef2701a2cd509dab1d4ce1983be135c65cb7ba95746b2003bae54b1998ce338b0cb38c59f';

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

    assert.strictEqual(hash.digest('hex'), expected);

    fs.writeFileSync('openssl.zip', data);

    await (util.promisify(extract)('openssl.zip', { dir: __dirname }));
  }
})();
