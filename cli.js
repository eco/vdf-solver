#!/usr/bin/env node

const commandLineArgs = require('command-line-args');
const assert = require('assert');
const { prove } = require('./vdf.js');

const OPT_DEFS = [
  {
    name: 'x',
    alias: 'x',
    type: String,
  },
  {
    name: 't',
    alias: 't',
    type: Number,
  },
  {
    name: 'n',
    alias: 'n',
    type: String,
  },
];

const options = commandLineArgs(OPT_DEFS);
const x = BigInt(options.x);
const t = Number(options.t);
const n = BigInt(options.n);

assert(x > 0n, 'x must be positive');
assert(n > 0n, 'N must be positive');
assert(n > x, 'N must be larger than x');
assert(t > 1, 't must be larger than 1');

(async () => {
  const [y, u] = await prove(x, t, n);
  const res = [y.toString(), u.map((elem) => elem.toString())];
  process.stdout.write(JSON.stringify(res));
  process.stdout.write('\n');
})();
