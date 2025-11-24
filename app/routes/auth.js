const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/register-company
 * Register a new company with an admin user (No invite required)
 */
router.post('/register-company',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('companyName').trim().notEmpty().withMessage('Company name is required'),
        body('firstName').optional().trim(),
        body('lastName').optional().trim(),
        body('country').optional().trim(),
        body('address').optional().trim(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password, companyName, firstName, lastName, country, address } = req.body;

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create company and admin user in a transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create company
                const company = await tx.company.create({
                    data: {
                        name: companyName,
                        country: country || null,
                        address: address || null,
                    }
                });

                // Create admin user
                const user = await tx.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        firstName: firstName || null,
                        lastName: lastName || null,
                        role: 'ADMIN', // First user is always admin
                        companyId: company.id,
                        weeklyHoursTarget: 40.0,
                    },
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
                                id: true,
                                name: true,
                                country: true,
                            }
                        }
                    }
                });

                return user;
            });

            // Generate JWT token
            const jwtToken = jwt.sign({ userId: result.id }, JWT_SECRET, { expiresIn: '7d' });

            // Set cookie
            res.cookie('token', jwtToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'lax',
            });

            res.json({ user: result, token: jwtToken });
        } catch (error) {
            console.error('Company registration error:', error);
            res.status(500).json({
                error: 'Company registration failed',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * POST /api/auth/register
 * Register a new user (Requires Invite Token)
 */
router.post('/register',
    [
        body('email').isEmail(),
        body('password').isLength({ min: 6 }),
        body('token').notEmpty().withMessage('Invite token is required'),
        body('firstName').optional().trim(),
        body('lastName').optional().trim(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password, token, firstName, lastName } = req.body;

            // Validate invite
            const invite = await prisma.invite.findUnique({
                where: { token },
                include: { company: true }
            });

            if (!invite) {
                return res.status(400).json({ error: 'Invalid invite token' });
            }

            // Check if email matches (optional, but good security practice)
            // Check if email matches (case-insensitive)
            if (invite.email.toLowerCase() !== email.toLowerCase()) {
                return res.status(400).json({ error: 'Email does not match invite' });
            }

            if (new Date() > invite.expiresAt) {
                return res.status(400).json({ error: 'Invite expired' });
            }

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user linked to company
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName: firstName || null,
                    lastName: lastName || null,
                    role: invite.role, // Use role from invite
                    companyId: invite.companyId,
                    weeklyHoursTarget: 40.0,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    weeklyHoursTarget: true,
                    companyId: true
                }
            });

            // Delete invite after successful registration
            await prisma.invite.delete({ where: { id: invite.id } });

            // Generate JWT token
            const jwtToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

            // Set cookie
            res.cookie('token', jwtToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'lax',
            });

            res.json({ user, token: jwtToken });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password } = req.body;

            // Find user
            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Check password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate JWT token
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

            // Set cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'lax',
            });

            // Return user without password
            const { password: _, ...userWithoutPassword } = user;
            res.json({ user: userWithoutPassword, token });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, async (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
