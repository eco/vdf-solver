const assert = require('assert');
const { spawnSync } = require('child_process');
const { expect } = require('chai');
const os = require('os');
const path = require('path');

const {
  prove, modexp, squarings, version,
} = require('../vdf.js');

// eslint-disable-next-line max-len
const n = '0xc7970ceedcc3b0754490201a7aa613cd73911081c790f5f1a8726f463550bb5b7ff0db8e1ea1189ec72f93d1650011bd721aeeacc2acde32a04107f0648c2813a31f5b0b7765ff8b44b4b6ffc93384b646eb09c7cf5e8592d40ea33c80039f35b4f14a04b51f7bfd781be4d1673164ba8eb991c2c4d730bbbe35f592bdef524af7e8daefd26c66fc02c479af89d64d373f442709439de66ceb955f3ea37d5159f6135809f85334b5cb1813addc80cd05609f10ac6a95ad65872c909525bdad32bc729592642920f24c61dc5b3c3b7923e56b16a4d9d373d8721f24a3fc0f1b3131f55615172866bccc30f95054c824e733a5eb6817f7bc16399d48c6361cc7e5';

describe('VDF', async () => {
  it('incremental computation', async () => {
    const a = modexp(3n, 2n ** BigInt(1 << 5), 101n);
    const b = modexp(a, 2n ** BigInt(1 << 5), 101n);

    const c = modexp(3n, 2n ** BigInt(1 << 6), 101n);

    assert.strictEqual(b, c);
  });

  it('squarings non-block-aligned', async () => {
    const a = squarings(3n, 123456n, 101n);
    assert.strictEqual(a, 31n);
    assert.strictEqual(a, modexp(3n, 1n << 123456n, 101n));
  });

  it('squarings block-aligned', async () => {
    const b = squarings(3n, 65536n, 101n);
    assert.strictEqual(b, 31n);
    assert.strictEqual(b, modexp(3n, 1n << 65536n, 101n));
  });

  it('x=2 t=4', async () => {
    const [y, u] = await prove(2, 4, n);
    assert.strictEqual(y.toString(), '9010845237437096738611885209346962913578723161723819705939535779395287109178782907262705959315384673261968488348904982075280569502507039175309639441876549186121226525887356178150885300639740441855196168517651138944822986969045376675479920080144099121866505248876831381049175775125511619223584800784177646588688039943671545437850659004407878739954570270942413706482704406949338591459698656569849310767942439671486397348998233935825382227321499992309462302471225958667644267237952608532795901926693989225420907227694995888960693478646888146495471941227662968320660084111575464914397175720920504102037171427264774760261');

    assert.strictEqual(u.length, 3);
    assert.strictEqual(u[0].toString(), '115792089237316195423570985008687907853269984665640564039457584007913129639936');
    assert.strictEqual(u[1].toString(), '17542637958148863569888268067731666006569951739357887477981153406568254004053349119730897349769226979127446995486484621099362776855366503274005663932923229353866063334897440486082865198030151259051196120839383689786647879459512801445932401269255273094845152793153729626674844062693801592011690156264471590570399190850078647323239827760127301519264399179534880495695423599053563138700259317873451503251179174331642581943536646769944735456206246025160953662545351709136559586172488655418337595880784357319970456034545502680111873951497218728746222020987931222733930090290159413863533058461674725528372002869314712322549');
    assert.strictEqual(u[2].toString(), '13555038430870476814545214317675619327949123370041431608337427144079063716085390991012420910686079212258141373986020100975568222786141985081417807666250296369616373917600967834018457601450599992783703940076880667072602018115010611448860593421572055856720416955900521220190622285528321998594729263124152699492146809962661188471804606300445464577045537111167309825396157119484644904557529009859941922497360337588235972638757893248310934792760040753333155208261611211281672594196718472969596273962241341468412424246067063844915748997717968306009455397686213118805523449658867232823122095768946113577004177197892509884486');
  });

  it('x=0x374...bfa t=7', async () => {
    const [y, u] = await prove('0x374cd38778e61027a78a9a6f98753f272ca8cbc23b909a8ab041f5030b17abfa', 7, n);
    assert.strictEqual(y.toString(16), 'b9683d695a96ec49589150d3be07dcc812c17f7451d6bae45e48d31083527062aad88b9ba9940c6d264939fda8c9fda790a1a5d68c2e22e6cab675e9f85b2e026a6ba22425d44ae83d3559fcb0648b3e0a54e19431f1ba0cf381a90cbf29f4980fb363e558decdd4bbd9f6e5978297ddd52fde9a83b7307020112306b7fd23572deb1b90af0d60ef13076243094dd60f1ae69fe1eadcbc80a54cad7be3c20f7ef10219dcd8d552255a4ba4b516fc4ddb00297d8e7f8c260ae558b6b6f46d420f74c5727ce310523b915fa6475c1e44e12e41e7da2b93d13303d9937d996bdc3967e3ed76061ee4f607f8681fe953a4308970dedbdfcd43bcedb8730ae2c62dd5');

    assert.strictEqual(u.length, 6);
    assert.strictEqual(u[0].toString(16), '721414da293610f94c3d79d27770e2f90ac4af6ad69d05561179b37773809a848e72cc8417603619a51c8beb33228deb23f0ad946ce8b2be46068e97a89057c528a31c3581d9ef37cd980816eb538d7b7a8f3a5e80572d02eaa290b167756f4de63663a8a7f4045ec8b9262ffa36af1d6f1d528ad9cee38fc4bec77e6a164c4bb10c24b7dfdbb2762e4364d734a2b7b60ec676565a3c33bc0283e04a29f56ef17fb1bc2761bc568acc7b4603a6b2e389256e4ed0f5205cdd8eedc38105350830d643417d4ac2ce5a8e259d1e5a37d663e80dfde912e7b927713c3867a792c15cde8a13299866a1d886a590b2b118007955bcbc4639152118f542a9156333e0a7');
    assert.strictEqual(u[1].toString(16), '37573096d95fecb661ad6c7c389d1a2bf9a6ce066bd5531d5cd2f1a9dc901aefc1ffcf1b851a93f9a9b00128100423ede1528e17896950653b39982f5cc1086e8cc06bec0d7b571b7ad2065fa0e7d1f7c608129635bf78b638456e4411663c036c6fa4cb28dcbedaae75e532c09be7e154407664627c1266097bf36ba1d112e34d5519acef4b86237b56f8ff5979b8aad3c6786a99e62bd02346495388448aec4fc72ba1b24b485ab9868fe1f9bda6857b6982e965e009cb90e3d80da07f864704f4b5d5fa5062e3b3dbddb90edbde43a7dadce17f7b0f8fe6146a4ef5efe662eeb6900a3ac5c3c947464e0a0427da9c2df274a9edd1b7aa741079a2649e8ff4');
    assert.strictEqual(u[2].toString(16), '7e747ea726d72f213ed27f19a0b39c2ab47472f2423ef42b3125cdc77b259a94d713867af8ab3251599eeda426012fdba47bfaa28d6843d396a906ab2eefb84487ff14d4f589dc304e69323994853be127c506346fc13cfb47b8aff6a971d31d839a3655cba7daccfb7e4a1f867d2b6bb202078a969832bf4cacf72b973aab469ad2a0125e70291783ff1ad7d929106cac582cde1bbb8268accfa7814c2d4d95b5b434c822b9d6001f31c451a8c9447a9fe986ebc2fb58f861aaf7310736cfe3332ad6368a4903219dd2fb880437ff62a80e5c07c672128548e09bec590e5380ce5c77be396b74b30e3a47fd355dd0e70591dfb7e865381b107ddff33264bba4');
    assert.strictEqual(u[3].toString(16), 'a472da84aa21150ee761b61863612d4823f30159534385c3990d992f43e211c67205c55c8c01d97f18568186fa249feea0a9bfd65a44659b96b97c70a2a87f58db3691d433edd1cbacf315b967eebc4ab76d03ef65575ae3b1621936354f06ce4536aab0c0ec5c40482f6c33740f8f1e65b9f63a77eba47befc2ead939a0efa4c4012e580d80877e225f35c403b1f179999d2ad13da1c593efdafde90971a7f17db1e31786d5949370a815003cad220e5ca8bd448c8f35380eb570c2ce4ff8f1b4c01351b1a2201ca6384a824f7baa9e6c6811b87629e2678600a3959f7c0fc55b72e27d354e248c1cb61da6e8d363664a36e8b6b96f44dfdf648fff73e860b');
    assert.strictEqual(u[4].toString(16), '354b1eed0a75a8251d449fe1e5c1ed24b736c0dbaff59457f552b2b9c0b9cae1abe5d462fb573aca77bbe7e3f3133a25408da094166e9f85315a7545aa4c7ebb314c4a0e563a5a8e5d6cbd84cd67252b2472276399601a8fed7dfe6fcd358c18436f7af9932ca9d2f1d9ac4b8ced5d6f11cef788ffeaf916b994aa28608ea52868a065bd934d8e1abdcb1b408aabceb964c72d95efe54c3d9ba082f3b34ac7c1965380b71b132b20e58f7498b8ceba8f60c7cf6ebecf5ee2106b4ad5442abb19fcdf81668617dc5f6e252d64e0c06c299ff501b338d7a20f91be960404b4f63bf87166464bed441473039e277b42341ec2d2f32b5e0fdb0e08c65f8cbca51727');
    assert.strictEqual(u[5].toString(16), '71f015e08b9eefa9e51524257ed604dc3b6f420581be499c32c818248f5573be40ea81d29e9fcc2f3c0598a32ee69123e174304556cd4d852d90ca492d1f6440ea503c20cd80ddbd38ae3282064215dd83cff70223b20064f1c3814e6acdf844dba48265a0dbd1ffd25c727e02bd6ca73aab342c7f538912624cfcb98831d07be947eab51eef489cc9d02396f38dee4419ae4250ce9dd14a846939eecb6f288bd4fbf20b6c91b636a4b535a9743da54af98d7a5d8d3047523eada2dae7a16c874f2566cb6ee4dcd23745e91ecd54b39dd4c806be8d3ed1d4d7c548b11663a5e71b37c158bbb0d8a3236a1fc1a3d4cfd88605faed1bb008aeec0c3b42cbddfaf9');
  });

  it('Callback test', async () => {
    const callback = async (state, counter, steps) => {
      assert.strictEqual(state.stops, '8');
      assert.strictEqual(state.blocksize, '1');
      assert.strictEqual(state.ys[0], '2');
      assert.strictEqual(steps, Number(state.stops));
      assert.strictEqual(state.ys.length, counter + 1);
      return true;
    };
    const [y] = await prove('2', 3, n, callback);
    assert.strictEqual(y.toString(), '13407807929942597099574024998205846127479365820592393377723561443721764030073546976801874298166903427690031858186486050853753882811946569946433649006084096');
  });

  it('Incremental test', async () => {
    let s;

    // Abort after just 1 block
    const r = await prove('2', 3, n, (state) => { s = state; return false; });
    assert.deepStrictEqual(r, []);
    assert.strictEqual(s.ys.length, 2);

    // Resume
    const [y] = await prove('2', 3, n, undefined, s);
    assert.strictEqual(y.toString(), '13407807929942597099574024998205846127479365820592393377723561443721764030073546976801874298166903427690031858186486050853753882811946569946433649006084096');
  });

  it('Incremental incorrect state size', async () => {
    let s;

    // Abort after just 1 block
    const r = await prove('2', 3, n, (state) => { s = state; return false; });
    assert.deepStrictEqual(r, []);
    assert.strictEqual(s.ys.length, 2);

    s.blocksize = '2';
    await assert.rejects(prove('2', 3, n, undefined, s), Error('State size mismatch'));
  });

  it('Incremental incorrect state number', async () => {
    let s;

    // Abort after just 1 block
    const r = await prove('2', 3, n, (state) => { s = state; return false; });
    assert.deepStrictEqual(r, []);
    assert.strictEqual(s.ys.length, 2);

    s.ys[0] = '3';
    await assert.rejects(prove('2', 3, n, undefined, s), Error('State number mismatch'));
  });

  it('runs as a process', async () => {
    const result = spawnSync('node', [path.resolve('cli.js'), '--x', '0x374cd38778e61027a78a9a6f98753f272ca8cbc23b909a8ab041f5030b17abfa', '--t', '7', '--n', n], { encoding: 'utf-8' });
    const [y, u] = JSON.parse(result.stdout);

    expect(result.status).to.equal(0);
    assert.strictEqual(y, '23405489023700498729489972183737749976518725757110765312264312782738895435060452030896881159694584628049444584788738259681496685497941658977145950878539312088606445154790549502493226148299384197582706338623862043574507059274274508554822280179889924640368443631756882577252669035903796229631962654366446959565398995490368344192127048599272370352529717560387171818610403434935916135055048230452056031249242057726955781436172309088607391347005429506831181164961316572310336585813396369265834149093721490381656041574653965138743595282703670856647562596980267254587060737145016017643808921481039319657917925812106789531093');
    assert.strictEqual(u.length, 6);
  });

  it('pure compute', async () => {
    const y = squarings(BigInt('0x374cd38778e61027a78a9a6f98753f272ca8cbc23b909a8ab041f5030b17abfa'), (1n << 20n) + 1n, BigInt(n));
    // eslint-disable-next-line max-len
    assert.strictEqual(y, 18380961277298711444066647618795817564354274558864652450683120581858455232813630578138084649039613799999414121958122206691038340429252091837364501854943264719526991638216289383196011037689672237518587537345461309578228366230762968693086791880758113668206398454776810895043077940156384455477884555327717893378361757633605230979313934539864554610050987616756544378194255892908100110064354839341445966265977815085911664355304421416725574929830445978736607362086335501729853348074360315807494108728540295639449675272116300413528107902450810082152479143162276342351708517452829829859539249128614298426668491697952742172709n);
  });

  it('pure proof', async () => {
    const [y] = await prove('0x374cd38778e61027a78a9a6f98753f272ca8cbc23b909a8ab041f5030b17abfa', 20, n);
    // eslint-disable-next-line max-len
    assert.strictEqual(y, 18380961277298711444066647618795817564354274558864652450683120581858455232813630578138084649039613799999414121958122206691038340429252091837364501854943264719526991638216289383196011037689672237518587537345461309578228366230762968693086791880758113668206398454776810895043077940156384455477884555327717893378361757633605230979313934539864554610050987616756544378194255892908100110064354839341445966265977815085911664355304421416725574929830445978736607362086335501729853348074360315807494108728540295639449675272116300413528107902450810082152479143162276342351708517452829829859539249128614298426668491697952742172709n);
  });

  it.skip('long compute', async () => {
    squarings(BigInt('0x374cd38778e61027a78a9a6f98753f272ca8cbc23b909a8ab041f5030b17abfa'), (1n << 25n) + 1n, BigInt(n));
  });

  it.skip('long proof', async () => {
    await prove('0x374cd38778e61027a78a9a6f98753f272ca8cbc23b909a8ab041f5030b17abfa', 25, n);
  });

  it('reports versions', async () => {
    const cpus = Array.from(new Set().add(...(os.cpus().map((cpu) => cpu.model))));
    console.log(version(), process.versions, cpus);
  });
});
