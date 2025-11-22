const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to authenticate JWT token from cookies or Authorization header
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        weeklyHoursTarget: true,
        companyId: true,
        company: {
          select: {
            country: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Middleware to require admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Middleware to check if user is owner of resource or admin
 * Now includes company scoping check for admins
 */
const requireOwnerOrAdmin = (userIdParam = 'userId') => {
  return async (req, res, next) => {
    const resourceUserId = parseInt(req.params[userIdParam]);

    // Owner can always access their own resources
    if (req.user.id === resourceUserId) {
      return next();
    }

    // Admin can access if target user is in same company
    if (req.user.role === 'ADMIN') {
      try {
        const targetUser = await prisma.user.findUnique({
          where: { id: resourceUserId },
          select: { companyId: true }
        });

        if (!targetUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        if (targetUser.companyId !== req.user.companyId) {
          return res.status(403).json({ error: 'Access denied - different company' });
        }

        return next();
      } catch (error) {
        console.error('Error checking company access:', error);
        return res.status(500).json({ error: 'Failed to verify access' });
      }
    }

    return res.status(403).json({ error: 'Access denied' });
  };
};

/**
 * Helper function to check if a user belongs to the same company
 * @param {number} targetUserId - The user ID to check
 * @param {number} requestingUserId - The requesting user's ID
 * @param {number} requestingUserCompanyId - The requesting user's company ID
 * @returns {Promise<boolean>} - True if same company, false otherwise
 */
const checkCompanyAccess = async (targetUserId, requestingUserId, requestingUserCompanyId) => {
  // Owner always has access to their own resources
  if (targetUserId === requestingUserId) {
    return true;
  }

  // Check if target user is in same company
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { companyId: true }
  });

  if (!targetUser) {
    return false;
  }

  return targetUser.companyId === requestingUserCompanyId;
};

/**
 * Middleware to require that a resource's owner is in the same company
 * Use this when you need to verify company access for a resource that has a userId field
 */
const requireSameCompany = (getUserIdFromResource) => {
  return async (req, res, next) => {
    try {
      const resourceUserId = await getUserIdFromResource(req);

      if (!resourceUserId) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Owner can always access their own resources
      if (req.user.id === resourceUserId) {
        return next();
      }

      // For admins, check company access
      if (req.user.role === 'ADMIN') {
        const hasAccess = await checkCompanyAccess(
          resourceUserId,
          req.user.id,
          req.user.companyId
        );

        if (hasAccess) {
          return next();
        }
      }

      return res.status(403).json({ error: 'Access denied - different company' });
    } catch (error) {
      console.error('Error in requireSameCompany middleware:', error);
      return res.status(500).json({ error: 'Failed to verify access' });
    }
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnerOrAdmin,
  requireSameCompany,
  checkCompanyAccess,
  JWT_SECRET,
};
