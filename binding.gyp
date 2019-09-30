{
  "targets": [
    {
      "target_name": "modexp_postbuild",
      "dependencies": ["modexp"],
      "conditions": [
        ['OS=="win"', {
          'copies': [{
            'destination': '<(PRODUCT_DIR)',
            'files': [
              '<(module_root_dir)/openssl-1.1.1d-win64-mingw/libcrypto-1_1-x64.dll',
            ]
          }]
        }]
      ]
    },
    {
      "target_name": "modexp",
      "sources": [ "modexp.cc" ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "defines": [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
      "conditions": [
        [
          'OS=="mac"', {
            'include_dirs': [
              '/usr/local/opt/openssl@1.1/include/',
            ],
            'libraries': [
              '/usr/local/opt/openssl@1.1/lib/libcrypto.a',
            ],
          }
        ],
        [
          'OS=="linux"', {
            'libraries': [
               '-lcrypto'
            ],
          }
        ],
        [
          'OS=="win"', {
            'include_dirs': [
              '<(module_root_dir)/openssl-1.1.1d-win64-mingw/include',
            ],
            'libraries': [
              '-l<(module_root_dir)/openssl-1.1.1d-win64-mingw/lib/libcrypto.dll.a'
            ],
          }
        ],
      ],
    }
  ]
}
