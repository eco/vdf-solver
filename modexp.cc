#define NAPI_EXPERIMENTAL
#include <napi.h>
#include <openssl/bn.h>
#include <openssl/crypto.h>
#include <iostream>

bool toBN(Napi::Env &env, Napi::BigInt &src, BIGNUM *dst) {
	size_t count = src.WordCount();
	std::vector<uint64_t> words(count);
	int sign;

	src.ToWords(&sign, &count, words.data());

	if (sign || (count == 0)) {
		Napi::TypeError::New(env, "All arguments must be > 0").ThrowAsJavaScriptException();
		return false;
	}

	BN_lebin2bn(reinterpret_cast<const unsigned char *>(words.data()), count * sizeof(uint64_t), dst);

	return true;
}

Napi::BigInt toBigInt(Napi::Env &env, const BIGNUM *src) {
	int bytes = BN_num_bytes(src);
	size_t count = (bytes + sizeof(uint64_t) - 1) / sizeof(uint64_t);
	std::vector<uint64_t> words(count);

	BN_bn2lebinpad(src, reinterpret_cast<unsigned char *>(words.data()), count * sizeof(uint64_t));

	return Napi::BigInt::New(env, 0, count, words.data());
}

Napi::Value ModExp(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();


	if (info.Length() != 3) {
		Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
		return env.Null();
	}

	if (!info[0].IsBigInt() || !info[1].IsBigInt() || !info[2].IsBigInt()) {
		Napi::TypeError::New(env, "All arguments must be BigInt").ThrowAsJavaScriptException();
		return env.Null();
	}

	Napi::BigInt x = info[0].As<Napi::BigInt>();
	Napi::BigInt e = info[1].As<Napi::BigInt>();
	Napi::BigInt N = info[2].As<Napi::BigInt>();

	if (env.IsExceptionPending())
		return env.Null();

	BN_CTX *ctx = BN_CTX_new();
	BN_CTX_start(ctx);

	BIGNUM *bnX = BN_CTX_get(ctx);
	BIGNUM *bnE = BN_CTX_get(ctx);
	BIGNUM *bnN = BN_CTX_get(ctx);
	BIGNUM *bnR = BN_CTX_get(ctx);

	Napi::Value r = env.Null();

	if (toBN(env, x, bnX) && toBN(env, e, bnE) && toBN(env, N, bnN)) {
		if (BN_mod_exp(bnR, bnX, bnE, bnN, ctx) != 1) {
			Napi::Error::New(env, "Failed to exponentiate").ThrowAsJavaScriptException();
		} else {
			r = toBigInt(env, bnR);
		}
	}

	BN_CTX_end(ctx);
	BN_CTX_free(ctx);

	return r;
}

Napi::Array Version(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	Napi::Array a = Napi::Array::New(env, 2);
	a.Set(0U, Napi::String::New(env, OpenSSL_version(OPENSSL_VERSION)));
	a.Set(1U, Napi::String::New(env, OpenSSL_version(OPENSSL_CFLAGS)));

	return a;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	exports.Set(Napi::String::New(env, "modexp"), Napi::Function::New(env, ModExp));
	exports.Set(Napi::String::New(env, "version"), Napi::Function::New(env, Version));
	return exports;
}

NODE_API_MODULE(modexp, Init)
