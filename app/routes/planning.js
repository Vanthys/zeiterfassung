const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/planning/me
 * Get planned days for current user
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const plannedDays = await prisma.plannedDay.findMany({
            where: { userId: req.user.id },
            orderBy: { date: 'asc' },
        });
        res.json(plannedDays);
    } catch (error) {
        console.error('Error fetching planned days:', error);
        res.status(500).json({ error: 'Failed to fetch planned days' });
    }
});

/**
 * GET /api/planning/user/:userId
 * Get planned days for specific user (owner or admin)
 */
router.get('/user/:userId', authenticateToken, requireOwnerOrAdmin('userId'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const plannedDays = await prisma.plannedDay.findMany({
            where: { userId },
            orderBy: { date: 'asc' },
        });
        res.json(plannedDays);
    } catch (error) {
        console.error('Error fetching planned days:', error);
        res.status(500).json({ error: 'Failed to fetch planned days' });
    }
});

/**
 * GET /api/planning/calendar/:year/:month
 * Get calendar view with actual vs planned hours
 */
router.get('/calendar/:year/:month', authenticateToken, async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Get planned days for the month
        const plannedDays = await prisma.plannedDay.findMany({
            where: {
                userId: req.user.id,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        // Get work sessions for the month
        const workSessions = await prisma.workSession.findMany({
            where: {
                userId: req.user.id,
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        // Group work sessions by date
        const actualHoursByDate = {};
        workSessions.forEach(session => {
            const dateKey = new Date(session.startTime).toISOString().split('T')[0];
            actualHoursByDate[dateKey] = (actualHoursByDate[dateKey] || 0) + session.duration;
        });

        // Combine planned and actual
        const calendar = plannedDays.map(planned => {
            const dateKey = new Date(planned.date).toISOString().split('T')[0];
            return {
                date: planned.date,
                plannedHours: planned.plannedHours,
                actualHours: actualHoursByDate[dateKey] || 0,
                notes: planned.notes,
            };
        });

        // Add days with actual hours but no plan
        Object.keys(actualHoursByDate).forEach(dateKey => {
            if (!plannedDays.find(p => new Date(p.date).toISOString().split('T')[0] === dateKey)) {
                calendar.push({
                    date: new Date(dateKey),
                    plannedHours: 0,
                    actualHours: actualHoursByDate[dateKey],
                    notes: null,
                });
            }
        });

        res.json(calendar.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ error: 'Failed to fetch calendar' });
    }
});

/**
 * POST /api/planning
 * Create a planned day
 */
router.post('/',
    authenticateToken,
    [
        body('date').isISO8601(),
        body('plannedHours').isFloat({ min: 0, max: 24 }),
        body('notes').optional().trim(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { date, plannedHours, notes } = req.body;

            const plannedDay = await prisma.plannedDay.create({
                data: {
                    userId: req.user.id,
                    date: new Date(date),
                    plannedHours,
                    notes: notes || null,
                },
            });

            res.json(plannedDay);
        } catch (error) {
            if (error.code === 'P2002') {
                return res.status(400).json({ error: 'Planned day already exists for this date' });
            }
            console.error('Error creating planned day:', error);
            res.status(500).json({ error: 'Failed to create planned day' });
        }
    }
);

/**
 * PUT /api/planning/:id
 * Update a planned day
 */
router.put('/:id',
    authenticateToken,
    [
        body('plannedHours').optional().isFloat({ min: 0, max: 24 }),
        body('notes').optional().trim(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const plannedDayId = parseInt(req.params.id);
            const { plannedHours, notes } = req.body;

            // Check ownership
            const existing = await prisma.plannedDay.findUnique({
                where: { id: plannedDayId },
            });

            if (!existing) {
                return res.status(404).json({ error: 'Planned day not found' });
            }

            if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const updateData = {};
            if (plannedHours !== undefined) updateData.plannedHours = plannedHours;
            if (notes !== undefined) updateData.notes = notes;

            const plannedDay = await prisma.plannedDay.update({
                where: { id: plannedDayId },
                data: updateData,
            });

            res.json(plannedDay);
        } catch (error) {
            console.error('Error updating planned day:', error);
            res.status(500).json({ error: 'Failed to update planned day' });
        }
    }
);

/**
 * DELETE /api/planning/:id
 * Delete a planned day
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const plannedDayId = parseInt(req.params.id);

        // Check ownership
        const existing = await prisma.plannedDay.findUnique({
            where: { id: plannedDayId },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Planned day not found' });
        }

        if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }

        await prisma.plannedDay.delete({
            where: { id: plannedDayId },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting planned day:', error);
        res.status(500).json({ error: 'Failed to delete planned day' });
    }
});

module.exports = router;
