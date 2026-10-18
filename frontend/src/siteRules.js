// Rules for site.json. The test file runs these against the REAL site.json,
// so a bad value committed from the Release Studio fails the Jenkins Test stage.

export const SITE_RULES = {
  headline: { check: (v) => typeof v === 'string' && v.trim().length >= 3 && v.length <= 80, rule: '3 to 80 characters' },
  tagline: { check: (v) => typeof v === 'string' && v.length <= 140, rule: 'up to 140 characters' },
  themeColor: { check: (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v), rule: 'a hex color like #2E7D32' },
  versionLabel: { check: (v) => typeof v === 'string' && /^v\d+\.\d+\.\d+$/.test(v), rule: 'like v1.2.0' },
  announcement: { check: (v) => typeof v === 'string' && v.length <= 160, rule: 'up to 160 characters' },
};

export function validateSite(site) {
  const errors = {};
  for (const [field, { check, rule }] of Object.entries(SITE_RULES)) {
    if (!check(site?.[field])) errors[field] = `must be ${rule}`;
  }
  return errors;
}
