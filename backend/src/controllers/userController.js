const userService = require('../services/userService');

/**
 * Controller for User Management Endpoints
 */
class UserController {
  async getAll(req, res, next) {
    try {
      const users = await userService.getAllUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req, res, next) {
    try {
      const result = await userService.updateRole(req.params.id, req.body.role);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async toggleActive(req, res, next) {
    try {
      const result = await userService.toggleActive(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const createdBy = req.body.createdBy || req.headers['x-user-id'];
      const user = await userService.createUser({ ...req.body, createdBy });
      res.status(201).json(user);
    } catch (err) {
      if (err.code === '23505') {
        if (err.detail && err.detail.includes('username')) {
          return res.status(409).json({ error: 'Username is already taken' });
        }
        if (err.detail && err.detail.includes('email')) {
          return res.status(409).json({ error: 'Email address is already in use' });
        }
        return res.status(409).json({ error: 'A user with this username or email already exists' });
      }
      next(err);
    }
  }
}

module.exports = new UserController();

