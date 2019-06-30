/* eslint-disable no-console */

const os = require('os');
const { prove } = require('./vdf.js');

const n = '0xc7970ceedcc3b0754490201a7aa613cd73911081c790f5f1a8726f463550bb5b7ff0db8e1ea1189ec72f93d1650011bd721aeeacc2acde32a04107f0648c2813a31f5b0b7765ff8b44b4b6ffc93384b646eb09c7cf5e8592d40ea33c80039f35b4f14a04b51f7bfd781be4d1673164ba8eb991c2c4d730bbbe35f592bdef524af7e8daefd26c66fc02c479af89d64d373f442709439de66ceb955f3ea37d5159f6135809f85334b5cb1813addc80cd05609f10ac6a95ad65872c909525bdad32bc729592642920f24c61dc5b3c3b7923e56b16a4d9d373d8721f24a3fc0f1b3131f55615172866bccc30f95054c824e733a5eb6817f7bc16399d48c6361cc7e5';


let best;
const loops = 10;
const t = 25;

console.log('VDF Solving 10 times');

const cpus = Array.from(new Set().add(...(os.cpus().map(cpu => cpu.model))));

for (let i = 0; i < loops; i += 1) {
  const start = process.hrtime.bigint();

  prove('0x374cd38778e61027a78a9a6f98753f272ca8cbc23b909a8ab041f5030b17abfa', t, n);

  const end = process.hrtime.bigint();
  const elapsed = end - start;

  console.log('Run', i, elapsed);

  if (best === undefined || elapsed < best) {
    best = elapsed;
  }
}

console.log(JSON.stringify(['Performance report', (Number(best) / 1000000000.0).toFixed(4), t, cpus, os.type(), os.release(), process.versions]));
