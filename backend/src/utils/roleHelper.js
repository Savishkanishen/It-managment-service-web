/**
 * Canonical slug → DB display-name mappings.
 * The itsm.roles table stores: 'Super Admin', 'IT Admin', 'Trainee', 'Zoom Requester'.
 * The frontend uses slugs:   'super_admin', 'it_admin', 'trainee', 'zoom_requester'.
 */

const ROLE_SLUG_MAP = {
  super_admin: 'Super Admin',
  it_admin: 'IT Admin',
  it_officer: 'IT Officer',
  trainee: 'Trainee',
  zoom_requester: 'Zoom Requester',
};

const ROLE_DISPLAY_MAP = Object.fromEntries(
  Object.entries(ROLE_SLUG_MAP).map(([slug, display]) => [display.toLowerCase(), slug])
);
// → { 'super admin': 'super_admin', 'it admin': 'it_admin', … }

/**
 * Convert any role string (display name, slug, or free-text) → canonical slug.
 * Returns one of: 'super_admin' | 'it_admin' | 'trainee' | 'zoom_requester'
 */
function normalizeRole(roleName) {
  if (!roleName) return 'trainee';
  const clean = roleName.toString().trim().toLowerCase().replace(/[\s\-]+/g, '_');

  // 1. Direct slug match  (e.g. 'super_admin', 'it_admin')
  if (ROLE_SLUG_MAP[clean]) return clean;

  // 2. Display-name match (e.g. 'Super Admin' → 'super_admin')
  const displayKey = roleName.toString().trim().toLowerCase();
  if (ROLE_DISPLAY_MAP[displayKey]) return ROLE_DISPLAY_MAP[displayKey];

  // 3. Keyword / fuzzy match (handles 'admin', 'IT', 'SuperAdmin', etc.)
  if (clean.includes('super')) return 'super_admin';
  if (clean.includes('it_admin') || clean.includes('itadmin')) return 'it_admin';
  if (clean.includes('it_officer') || clean.includes('itofficer') || clean.includes('officer')) return 'it_officer';
  if (clean === 'admin' || clean === 'administrator' || clean === 'it') return 'it_admin';
  if (clean.includes('zoom')) return 'zoom_requester';
  if (clean.includes('trainee') || clean.includes('intern') || clean.includes('staff')) return 'trainee';

  // 4. Fallback — return as-is so callers can decide
  return clean;
}

/**
 * Convert a slug (or any role string) → the exact display name stored in itsm.roles.
 * Returns one of: 'Super Admin' | 'IT Admin' | 'Trainee' | 'Zoom Requester'
 */
function denormalizeRole(slug) {
  if (!slug) return 'Trainee';

  // First normalise the input to a canonical slug, then map to display name
  const canonical = normalizeRole(slug);
  return ROLE_SLUG_MAP[canonical] || 'Trainee';
}

module.exports = {
  normalizeRole,
  denormalizeRole,
  ROLE_SLUG_MAP,
};
