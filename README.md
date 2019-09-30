[![Build Status](https://travis-ci.com/Eco/vdf-solver.svg?token=poXnpmiA2RAigkqypVN5&branch=master)](https://travis-ci.com/Eco/vdf-solver)
[![Coverage Status](https://coveralls.io/repos/github/Eco/vdf-solver/badge.svg?branch=master)](https://coveralls.io/github/Eco/vdf-solver?branch=master)

# vdf-solver
Standalone VDF Solver

## Usage

```
vdf-solver --x <starting x> --t <difficulty> --n <modulus>
```

## Caveats

This relies on modular exponentiation from bignum; a binding for OpenSSL BN
functions, which have high performance on most architectures. However, that
library currently won't build in Node 12+, and won't work in a browser.
