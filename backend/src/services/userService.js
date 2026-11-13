const db = require('../config/db');
const { normalizeRole, denormalizeRole } = require('../utils/roleHelper');

/**
 * User Service - Database operations for Users
 */
class UserService {
  async getAllUsers() {
    const { rows } = await db.query(`
      SELECT u.id, u.username, u.email, u.display_name, u.is_active, 
             d.name as division, r.name as role_name
      FROM itsm.users u
      LEFT JOIN itsm.divisions d ON u.division_id = d.id
      LEFT JOIN itsm.roles r ON u.role_id = r.id
      ORDER BY u.display_name ASC
    `);

    return rows.map(u => ({
      id: u.id,
      name: u.display_name,
      username: u.username,
      email: u.email,
      role: normalizeRole(u.role_name),
      roleName: u.role_name,
      division: u.division || 'IT Department',
      active: u.is_active,
      avatar: u.display_name ? u.display_name.slice(0, 2).toUpperCase() : 'US',
    }));
  }

  async updateRole(userIdOrUsername, role) {
    const targetRoleName = denormalizeRole(role);

    const roleRes = await db.query(
      'SELECT id, name FROM itsm.roles WHERE LOWER(name) = LOWER($1)',
      [targetRoleName]
    );

    if (roleRes.rows.length === 0) {
      const error = new Error(`Role '${role}' not recognized`);
      error.statusCode = 400;
      throw error;
    }

    const roleId = roleRes.rows[0].id;
    const { rows } = await db.query(
      'UPDATE itsm.users SET role_id = $1, updated_at = NOW() WHERE id::text = $2 OR LOWER(username) = LOWER($2) RETURNING id, display_name',
      [roleId, userIdOrUsername]
    );

    if (rows.length === 0) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      success: true,
      id: rows[0].id,
      role: normalizeRole(roleRes.rows[0].name),
    };
  }

  async toggleActive(userIdOrUsername) {
    const { rows } = await db.query(
      'UPDATE itsm.users SET is_active = NOT is_active, updated_at = NOW() WHERE id::text = $1 OR LOWER(username) = LOWER($1) RETURNING id, display_name, is_active',
      [userIdOrUsername]
    );

    if (rows.length === 0) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      id: rows[0].id,
      active: rows[0].is_active,
    };
  }

  async createUser({ username, name, email, password, role, division, createdBy }) {
    if (!username || !username.trim()) {
      const error = new Error('Username is required');
      error.statusCode = 400;
      throw error;
    }
    if (!email || !email.trim()) {
      const error = new Error('Email is required');
      error.statusCode = 400;
      throw error;
    }
    if (!name || !name.trim()) {
      const error = new Error('Display name is required');
      error.statusCode = 400;
      throw error;
    }

    const targetRoleName = denormalizeRole(role || 'trainee');
    const roleRes = await db.query('SELECT id, name FROM itsm.roles WHERE LOWER(name) = LOWER($1)', [targetRoleName]);
    const roleId = roleRes.rows[0]?.id || null;

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
      const fallback = await db.query("SELECT id, name FROM itsm.divisions WHERE code = 'IT' OR LOWER(name) LIKE '%technology%' LIMIT 1");
      if (fallback.rows.length > 0) {
        divisionId = fallback.rows[0].id;
        divisionName = fallback.rows[0].name;
      }
    }

    const { rows } = await db.query(
      `INSERT INTO itsm.users (username, email, display_name, password_hash, role_id, division_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [username.trim(), email.trim().toLowerCase(), name.trim(), password ? password.trim() : 'password123', roleId, divisionId]
    );

    const newUser = rows[0];

    // Audit log
    if (createdBy) {
      try {
        await db.query(
          `INSERT INTO itsm.audit_logs (user_id, action, entity_type, entity_id, description, module)
           VALUES ($1::uuid, 'CREATE', 'User', $2::text, $3, 'User Management')`,
          [createdBy, newUser.id, `Created user account ${newUser.display_name} (${newUser.username}) with role ${targetRoleName}`]
        );
      } catch (auditErr) {
        console.warn('Could not record user creation audit log:', auditErr.message);
      }
    }

    return {
      id: newUser.id,
      name: newUser.display_name,
      username: newUser.username,
      email: newUser.email,
      role: normalizeRole(targetRoleName),
      roleName: targetRoleName,
      division: divisionName,
      active: newUser.is_active,
      avatar: newUser.display_name ? newUser.display_name.slice(0, 2).toUpperCase() : 'US',
    };
  }
}

module.exports = new UserService();

