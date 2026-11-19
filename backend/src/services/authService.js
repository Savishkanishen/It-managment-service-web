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
   * Register a new user - Disabled for public self-registration.
   * Only IT Administrators are authorized to provision accounts via the IT Admin Portal.
   */
  async register({ name, username, email, password, role, division }) {
    // ── Enforce strict security: Public self-registration is disabled ──
    const error = new Error('Public self-registration is disabled. Only IT Administrators can create accounts through the IT Admin Portal.');
    error.statusCode = 403;
    throw error;
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

