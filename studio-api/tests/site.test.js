const { validateSite, diffSite, unknownFields } = require('../src/site');

const valid = {
  headline: 'Pasalamat Wall',
  tagline: 'Say thank you',
  themeColor: '#2E7D32',
  versionLabel: 'v1.0.0',
  announcement: '',
};

test('valid site has no errors', () => {
  expect(validateSite(valid)).toEqual([]);
});

test('bad hex color is rejected', () => {
  const errors = validateSite({ ...valid, themeColor: '#zzz' });
  expect(errors.map((e) => e.field)).toEqual(['themeColor']);
});

test('bad version label is rejected', () => {
  expect(validateSite({ ...valid, versionLabel: '1.0' })[0].field).toBe('versionLabel');
});

test('headline that is too short is rejected', () => {
  expect(validateSite({ ...valid, headline: 'Hi' })[0].field).toBe('headline');
});

test('diff lists only changed fields', () => {
  const changes = diffSite(valid, { ...valid, headline: 'Salamat!' });
  expect(changes).toEqual([{ field: 'headline', from: 'Pasalamat Wall', to: 'Salamat!' }]);
});

test('unknown fields are detected', () => {
  expect(unknownFields({ headline: 'x', hacker: true })).toEqual(['hacker']);
});
