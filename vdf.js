/* eslint-disable no-bitwise */

const { modexp, version } = require('bindings')('modexp.node');
const { keccak256 } = require('js-sha3');

function bnHex(bn, bytes) {
  return bn.toString(16).padStart(bytes * 2, '0');
}

function squarings(x, s, n) {
  const e = 1n << 32768n;

  let r = x;

  let i;
  for (i = 0n; (i + 32768n) <= s; i += 32768n) {
    r = modexp(r, e, n);
  }

  if (i < s) {
    r = modexp(r, 1n << (s - i), n);
  }

  return r;
}

// Each entry is for computing i
// [[dividend, divisor, [r-indexes]]...
// This is based on https://eprint.iacr.org/2018/712.pdf
const factors = [[]];

for (let t = 1; t <= 7; t += 1) {
  const steps = 1 << (t - 1);
  const divisor = 1 << t;
  const rmask = steps - 1;
  const f = [];
  for (let s = 0; s < steps; s += 1) {
    let rset = (~s) & rmask;
    const rs = [];

    let b = t - 1;
    while (rset > 0) {
      if (rset & 1) {
        rs.push(b);
      }
      rset >>= 1;
      b -= 1;
    }

    const row = [BigInt((s * 2) + 1), BigInt(divisor), rs.sort()];
    f.push(row);
  }
  factors.push(f);
}

async function prove(xin, tin, nin, callback, prevstate) {
  const x = BigInt(xin);
  const n = BigInt(nin);
  const t = BigInt(tin);

  const bytelen = Math.ceil(n.toString(16).length / 2);

  let state;
  if (prevstate) {
    state = {
      stops: BigInt(prevstate.stops),
      blocksize: BigInt(prevstate.blocksize),
      ys: prevstate.ys.map(v => BigInt(v)),
    };
  } else {
    const stops = 1n << BigInt(Math.min(Number(tin), factors.length - 1));

    state = {
      stops,
      blocksize: (1n << t) / stops,
      ys: [x],
    };
  }

  if (state.stops * state.blocksize !== (1n << t)) {
    throw Error('State size mismatch');
  }
  if (state.ys[0] !== x) {
    throw Error('State number mismatch');
  }

  for (let i = 1n; i <= state.stops; i += 1n) {
    if (!state.ys[i]) {
      state.ys[i] = squarings(state.ys[i - 1n], state.blocksize, n);
      if (callback) {
        // eslint-disable-next-line no-await-in-loop
        if (!await callback({
          stops: state.stops.toString(),
          blocksize: state.blocksize.toString(),
          ys: state.ys.map(v => v.toString()),
        }, Number(i), Number(state.stops))) {
          return [];
        }
      }
    }
  }
  const y = modexp(state.ys[state.stops], 2n, n);

  let xi = (x * x) % n;
  let yi = y;

  const Usqrt = [];
  const rs = [0];

  for (let i = 1; i < t; i += 1) {
    let uiprime;

    const f = factors[i];
    if (f) {
      uiprime = 1n;
      f.forEach(([divisor, dividend, rfac]) => {
        let base = state.ys[state.stops * divisor / dividend];

        if (rfac && rfac.length > 0) {
          let e = 1n;
          rfac.forEach((r) => {
            e *= rs[r];
          });
          base = modexp(base, e, n);
        }
        uiprime = (uiprime * base) % n;
      });
    } else {
      uiprime = squarings(xi, (1n << (t - BigInt(i))) - 1n, n); // this is sqrt u_i
    }
    const ui = (uiprime * uiprime) % n;

    Usqrt.push(uiprime);

    const hex = bnHex(x, bytelen)
      + bnHex(y, bytelen)
      + bnHex(uiprime, bytelen)
      + bnHex(i, 32);

    const result = [];
    for (let j = 0; j < hex.length; j += 2) {
      result.push(parseInt(hex.substr(j, 2), 16));
    }
    const rbn = BigInt(`0x${keccak256(result)}`);
    rs.push(rbn);

    // set up x_i+1 and y_i+1
    xi = (modexp(xi, rbn, n) * ui) % n;
    yi = (modexp(ui, rbn, n) * yi) % n;
  }

  return [y, Usqrt];
}

module.exports = {
  prove, modexp, squarings, version,
};
