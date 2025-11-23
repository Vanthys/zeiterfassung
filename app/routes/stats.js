const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/stats/weekly
 * Get weekly hours for current user
 */
router.get('/weekly', authenticateToken, async (req, res) => {
    try {
        const weeksToShow = parseInt(req.query.weeks) || 4;
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - (weeksToShow * 7));

        const workSessions = await prisma.workSession.findMany({
            where: {
                userId: req.user.id,
                startTime: {
                    gte: startDate,
                },
            },
            orderBy: { startTime: 'asc' },
        });

        // Group by week
        const weeklyData = {};
        workSessions.forEach(session => {
            const weekStart = getWeekStart(new Date(session.startTime));
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = {
                    weekStart: weekStart,
                    hours: 0,
                    sessions: 0,
                };
            }

            weeklyData[weekKey].hours += session.netDuration || 0;
            weeklyData[weekKey].sessions += 1;
        });

        const weeks = Object.values(weeklyData).sort((a, b) =>
            new Date(a.weekStart) - new Date(b.weekStart)
        );

        res.json({
            weeks,
            target: req.user.weeklyHoursTarget,
        });
    } catch (error) {
        console.error('Error fetching weekly stats:', error);
        res.status(500).json({ error: 'Failed to fetch weekly stats' });
    }
});

/**
 * GET /api/stats/weekly/:userId
 * Get weekly hours for specific user (owner or admin)
 */
router.get('/weekly/:userId', authenticateToken, requireOwnerOrAdmin('userId'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const weeksToShow = parseInt(req.query.weeks) || 4;
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - (weeksToShow * 7));

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { weeklyHoursTarget: true },
        });

        const workSessions = await prisma.workSession.findMany({
            where: {
                userId,
                startTime: {
                    gte: startDate,
                },
            },
            orderBy: { startTime: 'asc' },
        });

        // Group by week
        const weeklyData = {};
        workSessions.forEach(session => {
            const weekStart = getWeekStart(new Date(session.startTime));
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = {
                    weekStart: weekStart,
                    hours: 0,
                    sessions: 0,
                };
            }

            weeklyData[weekKey].hours += session.netDuration || 0;
            weeklyData[weekKey].sessions += 1;
        });

        const weeks = Object.values(weeklyData).sort((a, b) =>
            new Date(a.weekStart) - new Date(b.weekStart)
        );

        res.json({
            weeks,
            target: user.weeklyHoursTarget,
        });
    } catch (error) {
        console.error('Error fetching weekly stats:', error);
        res.status(500).json({ error: 'Failed to fetch weekly stats' });
    }
});

/**
 * GET /api/stats/monthly
 * Get monthly statistics for current user
 */
router.get('/monthly', authenticateToken, async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const workSessions = await prisma.workSession.findMany({
            where: {
                userId: req.user.id,
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        const totalHours = workSessions.reduce((sum, session) => sum + (session.netDuration || 0), 0);
        const totalSessions = workSessions.length;
        const avgSessionDuration = totalSessions > 0 ? totalHours / totalSessions : 0;

        // Get days worked
        const daysWorked = new Set(
            workSessions.map(s => new Date(s.startTime).toISOString().split('T')[0])
        ).size;

        res.json({
            year,
            month,
            totalHours,
            totalSessions,
            avgSessionDuration,
            daysWorked,
        });
    } catch (error) {
        console.error('Error fetching monthly stats:', error);
        res.status(500).json({ error: 'Failed to fetch monthly stats' });
    }
});

/**
 * GET /api/stats/sessions
 * Get work sessions for current user
 */
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const sessions = await prisma.workSession.findMany({
            where: { userId: req.user.id },
            orderBy: { startTime: 'desc' },
            take: limit,
        });

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

/**
 * GET /api/stats/sessions/:userId
 * Get work sessions for specific user (owner or admin)
 */
router.get('/sessions/:userId', authenticateToken, requireOwnerOrAdmin('userId'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const limit = parseInt(req.query.limit) || 50;

        const sessions = await prisma.workSession.findMany({
            where: { userId },
            orderBy: { startTime: 'desc' },
            take: limit,
        });

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

/**
 * GET /api/stats/audit-log
 * Get audit log of all work session edits (admin only)
 */
router.get('/audit-log', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const userId = req.query.userId ? parseInt(req.query.userId) : null;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        const limit = parseInt(req.query.limit) || 100;

        // Build where clause
        const where = {};

        // Filter by company - get all users in admin's company
        const companyUsers = await prisma.user.findMany({
            where: { companyId: req.user.companyId },
            select: { id: true }
        });
        const companyUserIds = companyUsers.map(u => u.id);

        // Filter by specific user if provided
        if (userId) {
            // Verify user is in the same company
            if (!companyUserIds.includes(userId)) {
                return res.status(403).json({ error: 'User not in your company' });
            }
            where.workSession = {
                userId: userId
            };
        } else {
            // Filter by all company users
            where.workSession = {
                userId: { in: companyUserIds }
            };
        }

        // Filter by date range
        if (startDate || endDate) {
            where.editedAt = {};
            if (startDate) where.editedAt.gte = startDate;
            if (endDate) where.editedAt.lte = endDate;
        }

        // Fetch audit log entries
        const auditLog = await prisma.workSessionEdit.findMany({
            where,
            include: {
                editor: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    }
                },
                workSession: {
                    select: {
                        id: true,
                        startTime: true,
                        endTime: true,
                        status: true,
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            }
                        }
                    }
                }
            },
            orderBy: { editedAt: 'desc' },
            take: limit,
        });

        // Parse changes JSON for each entry
        const formattedLog = auditLog.map(entry => ({
            ...entry,
            changes: JSON.parse(entry.changes)
        }));

        res.json(formattedLog);
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

/**
 * Helper function to get the start of the week (Monday)
 */
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

module.exports = router;
