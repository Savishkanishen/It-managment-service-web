const authService = require('../services/authService');

/**
 * Controller for Authentication Endpoints
 */
class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const user = await authService.login(username, password);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const userData = await authService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user: userData,
      });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const userId = req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ error: 'No user ID provided' });
      }
      const user = await authService.getUserById(userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async getRoles(req, res, next) {
    try {
      const roles = await authService.getRoles();
      res.json(roles);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();

