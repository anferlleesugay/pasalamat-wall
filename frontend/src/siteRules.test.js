import { describe, expect, test } from 'vitest';
import site from './site.json';
import { validateSite } from './siteRules';

// THE QUALITY GATE: if the Release Studio commits a bad value (for example
// themeColor "#zzz" with validation bypassed), this test fails in Jenkins and
// the pipeline stops before Deploy, so the live site keeps the previous version.
describe('site.json (deployed content)', () => {
  test('passes every content rule', () => {
    expect(validateSite(site)).toEqual({});
  });

  test('only contains known fields', () => {
    expect(Object.keys(site).sort()).toEqual(
      ['announcement', 'headline', 'tagline', 'themeColor', 'versionLabel'],
    );
  });
});

describe('content rules', () => {
  const good = {
    headline: 'Pasalamat Wall',
    tagline: 'Say thanks',
    themeColor: '#2E7D32',
    versionLabel: 'v1.0.0',
    announcement: '',
  };

  test('accepts valid content', () => {
    expect(validateSite(good)).toEqual({});
  });

  test('rejects a short hex color', () => {
    expect(validateSite({ ...good, themeColor: '#2E7' })).toHaveProperty('themeColor');
  });

  test('rejects a non-hex color', () => {
    expect(validateSite({ ...good, themeColor: '#zzzzzz' })).toHaveProperty('themeColor');
  });

  test('rejects a version label without the v prefix', () => {
    expect(validateSite({ ...good, versionLabel: '1.0.0' })).toHaveProperty('versionLabel');
  });

  test('rejects a headline that is too long', () => {
    expect(validateSite({ ...good, headline: 'x'.repeat(81) })).toHaveProperty('headline');
  });

  test('rejects a missing field', () => {
    const { tagline, ...withoutTagline } = good;
    expect(validateSite(withoutTagline)).toHaveProperty('tagline');
  });
});
