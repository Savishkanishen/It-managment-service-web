const db = require('../config/db');
const { normalizeRole, denormalizeRole } = require('../utils/roleHelper');
const { hashPassword, comparePassword } = require('../utils/passwordHelper');

/**
 * Authentication Business Logic & Database Queries
 */
class AuthService {
  /**
   * Authenticate a user by username and password
   */
  async login(username, password) {
    if (!username || !password) {
      const error = new Error('Username and password are required');
      error.statusCode = 400;
      throw error;
    }

    const { rows } = await db.query(
      `SELECT u.id, u.username, u.display_name, u.email, u.password_hash, u.is_active,
              r.name as role_name, d.name as division_name
       FROM itsm.users u
       LEFT JOIN itsm.roles r ON u.role_id = r.id
       LEFT JOIN itsm.divisions d ON u.division_id = d.id
       WHERE LOWER(u.username) = LOWER($1)`,
      [username.trim()]
    );

    if (rows.length === 0) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    const user = rows[0];

    if (!user.is_active) {
      const error = new Error('Account has been deactivated. Please contact Super Admin.');
      error.statusCode = 403;
      throw error;
    }

    const passwordCheck = await comparePassword(password, user.password_hash);
    if (!passwordCheck.matches) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    // Auto-upgrade legacy plaintext passwords to modern bcrypt hash
    if (passwordCheck.needsRehash) {
      try {
        const modernHash = await hashPassword(password);
        await db.query('UPDATE itsm.users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [modernHash, user.id]);
        console.log(`[Security] Upgraded password for user ${user.username} to modern bcrypt hash.`);
      } catch (upgradeErr) {
        console.warn('Could not auto-upgrade legacy password hash:', upgradeErr.message);
      }
    }

    const normalizedRole = normalizeRole(user.role_name);

    // Record login audit log
    try {
      await db.query(
        `INSERT INTO itsm.audit_logs (user_id, action, entity_type, entity_id, description, module)
         VALUES ($1::uuid, 'LOGIN', 'Session', $1::text, $2, 'Authentication')`,
        [user.id, `${user.display_name} logged in`]
      );
    } catch (e) {
      console.warn('Could not record login audit log:', e.message);
    }

    return {
      id: user.id,
      username: user.username,
      name: user.display_name,
      email: user.email,
      role: normalizedRole,
      roleName: user.role_name,
      division: user.division_name || 'IT Department',
      active: user.is_active,
      avatar: user.display_name ? user.display_name.slice(0, 2).toUpperCase() : 'US',
    };
  }

  /**
   * Register a new user
   */
  async register({ name, username, email, password, role, division }) {
    if (!name || !name.trim()) {
      const error = new Error('Full name is required');
      error.statusCode = 400;
      throw error;
    }
    if (!username || !username.trim()) {
      const error = new Error('Username is required');
      error.statusCode = 400;
      throw error;
    }
    if (!email || !email.trim()) {
      const error = new Error('Email address is required');
      error.statusCode = 400;
      throw error;
    }
    if (!password || password.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      throw error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      const error = new Error('Please enter a valid email address');
      error.statusCode = 400;
      throw error;
    }

    // Check existing username
    const existingUser = await db.query(
      'SELECT id FROM itsm.users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    if (existingUser.rows.length > 0) {
      const error = new Error('Username is already taken. Please choose another.');
      error.statusCode = 409;
      throw error;
    }

    // Check existing email
    const existingEmail = await db.query(
      'SELECT id FROM itsm.users WHERE LOWER(email) = LOWER($1)',
      [email.trim().toLowerCase()]
    );
    if (existingEmail.rows.length > 0) {
      const error = new Error('Email address is already in use.');
      error.statusCode = 409;
      throw error;
    }

    // ── Resolve role robustly ──────────────────────────────────────────
    const targetRoleName = denormalizeRole(role || 'trainee');
    console.log(`[AuthService] register role resolution: input="${role}" → denormalized="${targetRoleName}"`);

    let roleRes = await db.query(
      'SELECT id, name FROM itsm.roles WHERE LOWER(name) = LOWER($1)',
      [targetRoleName]
    );

    // Fuzzy fallback: try ILIKE if exact match missed
    if (roleRes.rows.length === 0) {
      console.warn(`[AuthService] Exact role match failed for "${targetRoleName}", trying fuzzy match...`);
      roleRes = await db.query(
        "SELECT id, name FROM itsm.roles WHERE LOWER(name) ILIKE '%' || LOWER($1) || '%' LIMIT 1",
        [targetRoleName.split(' ')[0]]
      );
    }

    // Last resort: auto-create the role
    if (roleRes.rows.length === 0) {
      console.warn(`[AuthService] No role found for "${targetRoleName}", inserting it into itsm.roles...`);
      try {
        roleRes = await db.query(
          'INSERT INTO itsm.roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name',
          [targetRoleName, `Auto-created role: ${targetRoleName}`]
        );
      } catch (insertErr) {
        console.error('[AuthService] Failed to auto-create role:', insertErr.message);
      }
    }

    const roleId = roleRes.rows[0]?.id || null;
    const finalRoleName = roleRes.rows[0]?.name || targetRoleName;
    console.log(`[AuthService] Final role: id=${roleId}, name="${finalRoleName}"`);

    // Resolve division (default: Information Technology)
    let divisionId = null;
    let divisionName = division || 'Information Technology';
    if (division) {
      const divRes = await db.query(
        `SELECT id, name FROM itsm.divisions 
         WHERE id::text = $1 
            OR LOWER(name) = LOWER($1) 
            OR LOWER(code) = LOWER($1)
            OR LOWER(name) ILIKE '%' || LOWER($1) || '%'
         LIMIT 1`,
        [division.trim()]
      );
      if (divRes.rows.length > 0) {
        divisionId = divRes.rows[0].id;
        divisionName = divRes.rows[0].name;
      }
    }

    if (!divisionId) {
      const fallback = await db.query(
        "SELECT id, name FROM itsm.divisions WHERE code = 'IT' OR LOWER(name) LIKE '%technology%' LIMIT 1"
      );
      if (fallback.rows.length > 0) {
        divisionId = fallback.rows[0].id;
        divisionName = fallback.rows[0].name;
      }
    }

    // Hash password with modern bcrypt before persisting
    const modernHashedPassword = await hashPassword(password.trim());

    // Insert user
    const { rows } = await db.query(
      `INSERT INTO itsm.users (username, email, display_name, password_hash, role_id, division_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, username, email, display_name, is_active`,
      [username.trim(), email.trim().toLowerCase(), name.trim(), modernHashedPassword, roleId, divisionId]
    );

    const newUser = rows[0];
    const normalizedRole = normalizeRole(finalRoleName);

    // Audit log
    try {
      await db.query(
        `INSERT INTO itsm.audit_logs (user_id, action, entity_type, entity_id, description, module)
         VALUES ($1::uuid, 'REGISTER', 'User', $1::text, $2, 'Authentication')`,
        [newUser.id, `New user ${newUser.display_name} (${newUser.username}) self-registered`]
      );
    } catch (auditErr) {
      console.warn('Could not record registration audit log:', auditErr.message);
    }

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.display_name,
      email: newUser.email,
      role: normalizedRole,
      roleName: finalRoleName,
      division: divisionName,
      active: newUser.is_active,
      avatar: newUser.display_name ? newUser.display_name.slice(0, 2).toUpperCase() : 'US',
    };
  }

  /**
   * Get user profile by ID
   */
  async getUserById(userId) {
    const { rows } = await db.query(
      `SELECT u.id, u.username, u.display_name, u.email, u.is_active,
              r.name as role_name, d.name as division_name
       FROM itsm.users u
       LEFT JOIN itsm.roles r ON u.role_id = r.id
       LEFT JOIN itsm.divisions d ON u.division_id = d.id
       WHERE u.id = $1`,
      [userId]
    );
    if (rows.length === 0) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    const user = rows[0];
    return {
      id: user.id,
      username: user.username,
      name: user.display_name,
      email: user.email,
      role: normalizeRole(user.role_name),
      roleName: user.role_name,
      division: user.division_name,
      active: user.is_active,
      avatar: user.display_name ? user.display_name.slice(0, 2).toUpperCase() : 'US',
    };
  }

  /**
   * Get all registered roles
   */
  async getRoles() {
    const { rows } = await db.query('SELECT id, name, description FROM itsm.roles ORDER BY name ASC');
    return rows.map(r => ({ id: r.id, name: r.name, slug: normalizeRole(r.name), description: r.description }));
  }
}

module.exports = new AuthService();

