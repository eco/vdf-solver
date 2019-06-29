/* eslint-disable no-bitwise */

const Web3 = require('web3');
const bignum = require('bignum');

const web3 = new Web3();

function bnHex(bn, bytes) {
  const hex = bn.toString(16);
  return `0x${hex.padStart(bytes * 2, '0')}`;
}

function modpow(x, e, n) {
  const xbn = bignum(x.toString());
  const ebn = bignum(e.toString());
  const nbn = bignum(n.toString());

  const r = xbn.powm(ebn, nbn);
  return BigInt(r.toString());
}

function squarings(x, s, n) {
  const xbn = bignum(x.toString());
  const nbn = bignum(n.toString());
  const ebn = bignum(1).shiftLeft(32768);

  let r = xbn;

  let i;
  for (i = 0n; (i + 32768n) <= s; i += 32768n) {
    r = r.powm(ebn, nbn);
  }

  if (i < s) {
    r = r.powm(bignum((1n << (s - i)).toString()), nbn);
  }

  return BigInt(r.toString());
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
  const y = modpow(state.ys[state.stops], 2n, n);

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
          base = modpow(base, e, n);
        }
        uiprime = (uiprime * base) % n;
      });
    } else {
      uiprime = squarings(xi, (1n << (t - BigInt(i))) - 1n, n); // this is sqrt u_i
    }
    const ui = (uiprime * uiprime) % n;

    Usqrt.push(uiprime);

    const res = web3.utils.soliditySha3(
      bnHex(x, bytelen),
      bnHex(y, bytelen),
      bnHex(uiprime, bytelen),
      i,
    );
    const rbn = BigInt(res);
    rs.push(rbn);

    // set up x_i+1 and y_i+1
    xi = (modpow(xi, rbn, n) * ui) % n;
    yi = (modpow(ui, rbn, n) * yi) % n;
  }

  return [y, Usqrt];
}

module.exports = { prove, modpow, squarings };
