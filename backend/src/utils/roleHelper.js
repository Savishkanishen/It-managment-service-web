function normalizeRole(roleName) {
  if (!roleName) return 'trainee';
  const clean = roleName.toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (clean.includes('super')) return 'super_admin';
  if (clean.includes('it_admin') || clean === 'it') return 'it_admin';
  if (clean.includes('zoom')) return 'zoom_requester';
  if (clean.includes('trainee') || clean.includes('intern')) return 'trainee';
  return clean;
}

function denormalizeRole(slug) {
  if (!slug) return 'Trainee';
  switch (slug.toLowerCase()) {
    case 'super_admin': return 'Super Admin';
    case 'it_admin': return 'IT Admin';
    case 'trainee': return 'Trainee';
    case 'zoom_requester': return 'Zoom Requester';
    default: return slug;
  }
}

module.exports = {
  normalizeRole,
  denormalizeRole,
};
