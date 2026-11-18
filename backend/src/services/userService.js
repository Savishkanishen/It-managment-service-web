const db = require('../config/db');
const { normalizeRole, denormalizeRole } = require('../utils/roleHelper');
const { hashPassword } = require('../utils/passwordHelper');

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

    let roleRes = await db.query(
      'SELECT id, name FROM itsm.roles WHERE LOWER(name) = LOWER($1)',
      [targetRoleName]
    );

    // Fuzzy fallback
    if (roleRes.rows.length === 0) {
      roleRes = await db.query(
        "SELECT id, name FROM itsm.roles WHERE LOWER(name) ILIKE '%' || LOWER($1) || '%' LIMIT 1",
        [targetRoleName.split(' ')[0]]
      );
    }

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

    // ── Resolve role robustly ──────────────────────────────────────────
    const targetRoleName = denormalizeRole(role || 'trainee');
    console.log(`[UserService] createUser role resolution: input="${role}" → denormalized="${targetRoleName}"`);

    let roleRes = await db.query(
      'SELECT id, name FROM itsm.roles WHERE LOWER(name) = LOWER($1)',
      [targetRoleName]
    );

    // Fuzzy fallback: try ILIKE if exact match missed
    if (roleRes.rows.length === 0) {
      console.warn(`[UserService] Exact role match failed for "${targetRoleName}", trying fuzzy match...`);
      roleRes = await db.query(
        "SELECT id, name FROM itsm.roles WHERE LOWER(name) ILIKE '%' || LOWER($1) || '%' LIMIT 1",
        [targetRoleName.split(' ')[0]]  // e.g. 'Super' from 'Super Admin'
      );
    }

    // Last resort: auto-create the role if the table has no matching row
    if (roleRes.rows.length === 0) {
      console.warn(`[UserService] No role found for "${targetRoleName}", inserting it into itsm.roles...`);
      try {
        roleRes = await db.query(
          'INSERT INTO itsm.roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name',
          [targetRoleName, `Auto-created role: ${targetRoleName}`]
        );
      } catch (insertErr) {
        console.error('[UserService] Failed to auto-create role:', insertErr.message);
      }
    }

    const roleId = roleRes.rows[0]?.id || null;
    const finalRoleName = roleRes.rows[0]?.name || targetRoleName;
    console.log(`[UserService] Final role: id=${roleId}, name="${finalRoleName}"`);

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

    const rawPassword = password ? password.trim() : 'password123';
    const modernHashedPassword = await hashPassword(rawPassword);

    const { rows } = await db.query(
      `INSERT INTO itsm.users (username, email, display_name, password_hash, role_id, division_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [username.trim(), email.trim().toLowerCase(), name.trim(), modernHashedPassword, roleId, divisionId]
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
      role: normalizeRole(finalRoleName),
      roleName: finalRoleName,
      division: divisionName,
      active: newUser.is_active,
      avatar: newUser.display_name ? newUser.display_name.slice(0, 2).toUpperCase() : 'US',
    };
  }
}

module.exports = new UserService();

