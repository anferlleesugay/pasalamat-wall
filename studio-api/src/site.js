// Rules for the editable site content (frontend/src/site.json).
// The real quality gate is the frontend test in Jenkins; these checks give
// instant feedback in the Release Studio before anything is committed.

const SITE_PATH = 'frontend/src/site.json';

const FIELDS = {
  headline: { label: 'Headline', check: (v) => typeof v === 'string' && v.trim().length >= 3 && v.length <= 80, rule: '3 to 80 characters' },
  tagline: { label: 'Tagline', check: (v) => typeof v === 'string' && v.length <= 140, rule: 'up to 140 characters' },
  themeColor: { label: 'Theme color', check: (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v), rule: 'a hex color like #2E7D32' },
  versionLabel: { label: 'Version label', check: (v) => typeof v === 'string' && /^v\d+\.\d+\.\d+$/.test(v), rule: 'like v1.2.0' },
  announcement: { label: 'Announcement', check: (v) => typeof v === 'string' && v.length <= 160, rule: 'up to 160 characters' },
};

function unknownFields(site) {
  return Object.keys(site).filter((key) => !(key in FIELDS));
}

function validateSite(site) {
  const errors = [];
  for (const [key, field] of Object.entries(FIELDS)) {
    if (!field.check(site[key])) {
      errors.push({ field: key, message: `${field.label} must be ${field.rule}` });
    }
  }
  return errors;
}

function diffSite(before, after) {
  return Object.keys(FIELDS)
    .filter((key) => after[key] !== undefined && before[key] !== after[key])
    .map((key) => ({ field: key, from: before[key], to: after[key] }));
}

module.exports = { SITE_PATH, FIELDS, unknownFields, validateSite, diffSite };
