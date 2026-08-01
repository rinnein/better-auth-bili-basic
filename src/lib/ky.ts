import * as kyModule from 'ky';

const ky =
  (kyModule.default as unknown as { default?: typeof kyModule.default })
    .default ?? kyModule.default;

export const kyi = ky.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
  },
});
