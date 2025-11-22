const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { startOfDay, endOfDay, parseISO, format } = require('date-fns');

const router = express.Router();
const prisma = new PrismaClient();


/**
 * GET /api/calendar
 * Get calendar data (planned vs worked) for a date range
 * Query: start (YYYY-MM-DD), end (YYYY-MM-DD), userId (optional, admin only)
 */
router.get('/',
    authenticateToken,
    [
        query('start').isISO8601(),
        query('end').isISO8601(),
        query('userId').optional().isString(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { start, end, userId: requestedUserId } = req.query;
            const startDate = parseISO(start);
            const endDate = parseISO(end);

            let userIds = [req.user.id];
            let includeUserInfo = false;

            // Admin can request other users' calendars
            if (requestedUserId && req.user.role === 'ADMIN') {
                if (requestedUserId === 'all') {
                    // Get all users in the company
                    const companyUsers = await prisma.user.findMany({
                        where: { companyId: req.user.companyId },
                        select: { id: true }
                    });
                    userIds = companyUsers.map(u => u.id);
                    includeUserInfo = true;
                } else {
                    // Specific user - verify they're in the same company
                    const targetUser = await prisma.user.findUnique({
                        where: { id: parseInt(requestedUserId) },
                        select: { id: true, companyId: true }
                    });

                    if (!targetUser || targetUser.companyId !== req.user.companyId) {
                        return res.status(403).json({ error: 'Access denied' });
                    }

                    userIds = [targetUser.id];
                    includeUserInfo = true;
                }
            }

            // 1. Get Planned Sessions
            const plannedSessions = await prisma.plannedSession.findMany({
                where: {
                    userId: { in: userIds },
                    startTime: {
                        gte: startDate,
                        lte: endOfDay(endDate),
                    },
                },
                include: includeUserInfo ? {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                } : undefined
            });

            // 2. Get Work Sessions
            const workSessions = await prisma.workSession.findMany({
                where: {
                    userId: { in: userIds },
                    startTime: {
                        gte: startDate,
                        lte: endOfDay(endDate),
                    },
                },
                include: {
                    breaks: true,
                    ...(includeUserInfo ? {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    } : {})
                },
            });

            // Format for calendar
            const events = [
                ...plannedSessions.map(s => ({
                    id: `planned-${s.id}`,
                    dbId: s.id,
                    title: s.note || 'Planned Work',
                    start: s.startTime,
                    end: s.endTime,
                    type: 'planned',
                    isOnCall: s.isOnCall,
                    ...(includeUserInfo && s.user ? {
                        userId: s.user.id,
                        userName: `${s.user.firstName} ${s.user.lastName}`,
                        userEmail: s.user.email
                    } : {})
                })),
                ...workSessions.map(s => ({
                    id: `worked-${s.id}`,
                    dbId: s.id,
                    title: 'Worked',
                    start: s.startTime,
                    end: s.endTime || new Date(), // If ongoing, use current time
                    type: 'worked',
                    status: s.status,
                    ...(includeUserInfo && s.user ? {
                        userId: s.user.id,
                        userName: `${s.user.firstName} ${s.user.lastName}`,
                        userEmail: s.user.email
                    } : {})
                }))
            ];

            res.json(events);

        } catch (error) {
            console.error('Error fetching calendar data:', error);
            res.status(500).json({ error: 'Failed to fetch calendar data' });
        }
    }
);

/**
 * POST /api/calendar/plan
 * Create a planned session
 * Body: start (ISO), end (ISO), note (optional), isOnCall (optional)
 */
router.post('/plan',
    authenticateToken,
    [
        body('start').isISO8601(),
        body('end').isISO8601(),
        body('note').optional().isString(),
        body('isOnCall').optional().isBoolean(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { start, end, note, isOnCall } = req.body;
            const userId = req.user.id;

            const plannedSession = await prisma.plannedSession.create({
                data: {
                    userId,
                    startTime: parseISO(start),
                    endTime: parseISO(end),
                    note: note || null,
                    isOnCall: isOnCall || false,
                },
            });

            res.json(plannedSession);

        } catch (error) {
            console.error('Error creating planned session:', error);
            res.status(500).json({ error: 'Failed to save plan' });
        }
    }
);

/**
 * PUT /api/calendar/plan/:id
 * Update a planned session
 */
router.put('/plan/:id',
    authenticateToken,
    [
        body('start').isISO8601(),
        body('end').isISO8601(),
        body('note').optional().isString(),
        body('isOnCall').optional().isBoolean(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { start, end, note, isOnCall } = req.body;
            const id = parseInt(req.params.id);
            const userId = req.user.id;

            // Verify ownership
            const existing = await prisma.plannedSession.findFirst({
                where: { id, userId }
            });

            if (!existing) {
                return res.status(404).json({ error: 'Session not found' });
            }

            const updated = await prisma.plannedSession.update({
                where: { id },
                data: {
                    startTime: parseISO(start),
                    endTime: parseISO(end),
                    note: note || null,
                    isOnCall: isOnCall !== undefined ? isOnCall : existing.isOnCall,
                },
            });

            res.json(updated);

        } catch (error) {
            console.error('Error updating planned session:', error);
            res.status(500).json({ error: 'Failed to update plan' });
        }
    }
);

/**
 * DELETE /api/calendar/plan/:id
 * Delete a planned session
 */
router.delete('/plan/:id',
    authenticateToken,
    async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const userId = req.user.id;

            // Verify ownership
            const existing = await prisma.plannedSession.findFirst({
                where: { id, userId }
            });

            if (!existing) {
                return res.status(404).json({ error: 'Session not found' });
            }

            await prisma.plannedSession.delete({
                where: { id },
            });

            res.json({ success: true });

        } catch (error) {
            console.error('Error deleting planned session:', error);
            res.status(500).json({ error: 'Failed to delete plan' });
        }
    }
);

module.exports = router;
