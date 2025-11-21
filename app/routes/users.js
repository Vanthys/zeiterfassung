const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/users
 * Get all users (authenticated users can see basic info, admin sees all)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: req.user.role === 'ADMIN',
                firstName: true,
                lastName: true,
                role: req.user.role === 'ADMIN',
                weeklyHoursTarget: req.user.role === 'ADMIN',
                createdAt: req.user.role === 'ADMIN',
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
 * Get online status of all users
 */
router.get('/online', authenticateToken, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });

        // Get last entry for each user
        const usersWithStatus = await Promise.all(
            users.map(async (user) => {
                const lastEntry = await prisma.timeEntry.findFirst({
                    where: { userId: user.id },
                    orderBy: { time: 'desc' },
                });

                return {
                    ...user,
                    online: lastEntry ? lastEntry.type === 'START' : false,
                    time: lastEntry?.time || null,
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
 * Update user (admin only)
 */
router.put('/:id',
    authenticateToken,
    requireAdmin,
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
