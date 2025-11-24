const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// Helper to get frontend URL without trailing slash
const getFrontendUrl = () => {
    const url = process.env.FRONTEND_URL || 'http://localhost:5173';
    return url.endsWith('/') ? url.slice(0, -1) : url;
};

/**
 * POST /api/invites
 * Create a new invite (Admin only)
 */
router.post('/', authenticateToken, requireAdmin, [
    body('email').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email: rawEmail } = req.body;
        const email = rawEmail.toLowerCase();

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        const invite = await prisma.invite.create({
            data: {
                email,
                token,
                companyId: req.user.companyId,
                expiresAt,
                role: 'USER' // Default role
            }
        });

        res.json({
            message: 'Invite created',
            inviteLink: `${getFrontendUrl()}/register?token=${token}`,
            token
        });

    } catch (error) {
        console.error('Error creating invite:', error);
        res.status(500).json({ error: 'Failed to create invite' });
    }
});

/**
 * GET /api/invites
 * List all active invites for the company (Admin only)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const invites = await prisma.invite.findMany({
            where: {
                companyId: req.user.companyId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Add full link to response
        const invitesWithLinks = invites.map(invite => ({
            ...invite,
            link: `${getFrontendUrl()}/register?token=${invite.token}`
        }));

        res.json(invitesWithLinks);
    } catch (error) {
        console.error('Error listing invites:', error);
        res.status(500).json({ error: 'Failed to list invites' });
    }
});

/**
 * GET /api/invites/:token
 * Validate invite token
 */
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const invite = await prisma.invite.findUnique({
            where: { token },
            include: { company: true }
        });

        if (!invite) {
            return res.status(404).json({ error: 'Invalid invite' });
        }

        if (new Date() > invite.expiresAt) {
            return res.status(400).json({ error: 'Invite expired' });
        }

        res.json({
            email: invite.email,
            companyName: invite.company.name
        });

    } catch (error) {
        console.error('Error validating invite:', error);
        res.status(500).json({ error: 'Failed to validate invite' });
    }
});

module.exports = router;
