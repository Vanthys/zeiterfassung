const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/users
 * Get all users (authenticated users can see basic info, admin sees all in company)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Only allow admins to see all users in their company
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const users = await prisma.user.findMany({
            where: { companyId: req.user.companyId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                weeklyHoursTarget: true,
                createdAt: true,
            },
            orderBy: { email: 'asc' },
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/users/online
 * Get online status of all users in company
 */
router.get('/online', authenticateToken, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { companyId: req.user.companyId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });

        // Get current or last session for each user
        const usersWithStatus = await Promise.all(
            users.map(async (user) => {
                // First check for ongoing/paused session
                const currentSession = await prisma.workSession.findFirst({
                    where: {
                        userId: user.id,
                        status: { in: ['ONGOING', 'PAUSED'] }
                    },
                    orderBy: { startTime: 'desc' },
                });

                let time = null;
                let online = false;

                if (currentSession) {
                    online = true;
                    time = currentSession.startTime;
                } else {
                    // If no current session, get the last completed session
                    const lastSession = await prisma.workSession.findFirst({
                        where: {
                            userId: user.id,
                            status: 'COMPLETED'
                        },
                        orderBy: { endTime: 'desc' },
                    });
                    if (lastSession) {
                        time = lastSession.endTime;
                    }
                }

                return {
                    ...user,
                    online,
                    time,
                };
            })
        );

        res.json(usersWithStatus);
    } catch (error) {
        console.error('Error fetching online status:', error);
        res.status(500).json({ error: 'Failed to fetch online status' });
    }
});

/**
 * PUT /api/users/:id
 * Update user (admin or self)
 */
router.put('/:id',
    authenticateToken,
    [
        body('role').optional().isIn(['ADMIN', 'USER']),
        body('weeklyHoursTarget').optional().isFloat({ min: 0 }),
        body('firstName').optional().trim(),
        body('lastName').optional().trim(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const userId = parseInt(req.params.id);
            const { role, weeklyHoursTarget, firstName, lastName } = req.body;

            // Check permissions: Admin can update anyone in company, User can only update self
            if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Verify user belongs to same company if admin is updating another user
            if (req.user.role === 'ADMIN' && req.user.id !== userId) {
                const targetUser = await prisma.user.findUnique({ where: { id: userId } });
                if (!targetUser || targetUser.companyId !== req.user.companyId) {
                    return res.status(404).json({ error: 'User not found' });
                }
            }

            // Only admin can update role
            if (role && req.user.role !== 'ADMIN') {
                return res.status(403).json({ error: 'Only admins can update roles' });
            }

            const updateData = {};
            if (role !== undefined) updateData.role = role;
            if (weeklyHoursTarget !== undefined) updateData.weeklyHoursTarget = weeklyHoursTarget;
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;

            const user = await prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    weeklyHoursTarget: true,
                },
            });

            res.json(user);
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    }
);

/**
 * POST /api/users/:id/reset-password
 * Reset user password (admin only)
 */
router.post('/:id/reset-password',
    authenticateToken,
    requireAdmin,
    [
        body('newPassword').isLength({ min: 6 }),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const userId = parseInt(req.params.id);
            const { newPassword } = req.body;

            // Verify user belongs to same company
            const targetUser = await prisma.user.findUnique({ where: { id: userId } });
            if (!targetUser || targetUser.companyId !== req.user.companyId) {
                return res.status(404).json({ error: 'User not found' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword },
            });

            res.json({ message: 'Password reset successfully' });
        } catch (error) {
            console.error('Error resetting password:', error);
            res.status(500).json({ error: 'Failed to reset password' });
        }
    }
);

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Prevent deleting yourself
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Verify user belongs to same company
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser || targetUser.companyId !== req.user.companyId) {
            return res.status(404).json({ error: 'User not found' });
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
