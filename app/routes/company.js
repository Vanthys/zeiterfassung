const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/company
 * Get current user's company details
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: { id: req.user.companyId }
        });

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json(company);
    } catch (error) {
        console.error('Error fetching company:', error);
        res.status(500).json({ error: 'Failed to fetch company details' });
    }
});

/**
 * PUT /api/company
 * Update company details (Admin only)
 */
router.put('/', authenticateToken, requireAdmin, [
    body('name').notEmpty().trim().withMessage('Company name is required'),
    body('address').optional().trim(),
    body('country').optional().trim().isLength({ min: 2, max: 5 }).withMessage('Invalid country code'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, address, country } = req.body;

        const company = await prisma.company.update({
            where: { id: req.user.companyId },
            data: {
                name,
                address,
                country
            }
        });

        res.json(company);
    } catch (error) {
        console.error('Error updating company:', error);
        res.status(500).json({ error: 'Failed to update company details' });
    }
});

module.exports = router;
