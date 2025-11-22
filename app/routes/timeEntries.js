const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin, checkCompanyAccess } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/entries/me
 * Get current user's time entries
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const entries = await prisma.timeEntry.findMany({
            where: { userId: req.user.id },
            orderBy: { time: 'desc' },
        });
        res.json(entries);
    } catch (error) {
        console.error('Error fetching entries:', error);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

/**
 * GET /api/entries
 * Get all time entries for company (admin only)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Get all users in the admin's company
        const companyUsers = await prisma.user.findMany({
            where: { companyId: req.user.companyId },
            select: { id: true }
        });

        const userIds = companyUsers.map(u => u.id);

        const entries = await prisma.timeEntry.findMany({
            where: {
                userId: { in: userIds }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    }
                }
            },
            orderBy: { time: 'desc' },
        });
        res.json(entries);
    } catch (error) {
        console.error('Error fetching entries:', error);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

/**
 * GET /api/entries/user/:userId
 * Get entries for specific user (admin or owner)
 */
router.get('/user/:userId', authenticateToken, requireOwnerOrAdmin('userId'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const entries = await prisma.timeEntry.findMany({
            where: { userId },
            orderBy: { time: 'desc' },
        });
        res.json(entries);
    } catch (error) {
        console.error('Error fetching entries:', error);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

/**
 * GET /api/entries/canstart
 * Check if current user can start a new session
 */
router.get('/canstart', authenticateToken, async (req, res) => {
    try {
        const lastEntry = await prisma.timeEntry.findFirst({
            where: { userId: req.user.id },
            orderBy: { time: 'desc' },
        });

        const canStart = !lastEntry || lastEntry.type === 'STOP';
        res.json({ canStart });
    } catch (error) {
        console.error('Error checking can start:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

/**
 * POST /api/entries
 * Create a new time entry for current user
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { time, type, note } = req.body;

        if (!time || !type) {
            return res.status(400).json({ error: 'Time and type are required' });
        }

        if (type !== 'START' && type !== 'STOP') {
            return res.status(400).json({ error: 'Type must be START or STOP' });
        }

        // Check if user can perform this action
        const lastEntry = await prisma.timeEntry.findFirst({
            where: { userId: req.user.id },
            orderBy: { time: 'desc' },
        });

        if (type === 'START' && lastEntry && lastEntry.type === 'START') {
            return res.status(400).json({ error: 'Cannot start - already started' });
        }

        if (type === 'STOP' && (!lastEntry || lastEntry.type === 'STOP')) {
            return res.status(400).json({ error: 'Cannot stop - not started' });
        }

        // Create entry
        const entry = await prisma.timeEntry.create({
            data: {
                userId: req.user.id,
                time: new Date(time),
                type,
                note: note || null,
            },
        });

        // If this is a STOP entry, create a WorkSession
        if (type === 'STOP' && lastEntry && lastEntry.type === 'START') {
            const startTime = new Date(lastEntry.time);
            const endTime = new Date(time);
            const duration = (endTime - startTime) / (1000 * 60 * 60); // hours

            await prisma.workSession.create({
                data: {
                    userId: req.user.id,
                    startTime,
                    endTime,
                    duration,
                },
            });
        }

        res.json(entry);
    } catch (error) {
        console.error('Error creating entry:', error);
        res.status(500).json({ error: 'Failed to create entry' });
    }
});

/**
 * DELETE /api/entries/:id
 * Delete a time entry (owner or admin)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const entryId = parseInt(req.params.id);

        // Get entry to check ownership
        const entry = await prisma.timeEntry.findUnique({
            where: { id: entryId },
        });

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        // Check authorization with company scoping
        const hasAccess = await checkCompanyAccess(entry.userId, req.user.id, req.user.companyId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await prisma.timeEntry.delete({
            where: { id: entryId },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting entry:', error);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

/**
 * PUT /api/entries/:id
 * Edit a time entry (owner or admin)
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const entryId = parseInt(req.params.id);
        const { time, type, note, reason } = req.body;

        // Get existing entry
        const entry = await prisma.timeEntry.findUnique({
            where: { id: entryId },
        });

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        // Check authorization with company scoping
        const hasAccess = await checkCompanyAccess(entry.userId, req.user.id, req.user.companyId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Validate input
        if (!time || !type) {
            return res.status(400).json({ error: 'Time and type are required' });
        }

        if (type !== 'START' && type !== 'STOP') {
            return res.status(400).json({ error: 'Type must be START or STOP' });
        }

        const newTime = new Date(time);
        const now = new Date();

        if (newTime > now) {
            return res.status(400).json({ error: 'Cannot set time in the future' });
        }

        // Prevent type changes - type must remain the same
        if (type !== entry.type) {
            return res.status(400).json({
                error: 'Cannot change entry type. If you started work, you must stop it; if you stopped, you must have started.'
            });
        }

        // Create edit history record
        const editRecord = await prisma.timeEntryEdit.create({
            data: {
                timeEntryId: entryId,
                editedBy: req.user.id,
                previousTime: entry.time,
                previousType: entry.type,
                previousNote: entry.note,
                newTime,
                newType: type,
                newNote: note || null,
                reason: reason || null,
            },
        });

        // Update the entry
        const updatedEntry = await prisma.timeEntry.update({
            where: { id: entryId },
            data: {
                time: newTime,
                type,
                note: note || null,
            },
        });

        // Handle WorkSession updates
        if (entry.type === 'STOP' || type === 'STOP') {
            // Find affected work session(s)
            const affectedSession = await prisma.workSession.findFirst({
                where: {
                    userId: entry.userId,
                    OR: [
                        { startTime: entry.time },
                        { endTime: entry.time },
                    ],
                },
            });

            if (affectedSession) {
                // Delete the old session
                await prisma.workSession.delete({
                    where: { id: affectedSession.id },
                });

                // Recalculate and create new session if still valid
                if (type === 'STOP') {
                    const startEntry = await prisma.timeEntry.findFirst({
                        where: {
                            userId: entry.userId,
                            type: 'START',
                            time: { lt: newTime },
                        },
                        orderBy: { time: 'desc' },
                    });

                    if (startEntry) {
                        const duration = (newTime - new Date(startEntry.time)) / (1000 * 60 * 60);
                        await prisma.workSession.create({
                            data: {
                                userId: entry.userId,
                                startTime: new Date(startEntry.time),
                                endTime: newTime,
                                duration,
                            },
                        });
                    }
                }
            }
        }

        res.json({
            entry: updatedEntry,
            edit: editRecord
        });
    } catch (error) {
        console.error('Error editing entry:', error);
        res.status(500).json({ error: 'Failed to edit entry' });
    }
});

/**
 * GET /api/entries/:id/history
 * Get edit history for a time entry
 */
router.get('/:id/history', authenticateToken, async (req, res) => {
    try {
        const entryId = parseInt(req.params.id);

        // Get entry to check authorization
        const entry = await prisma.timeEntry.findUnique({
            where: { id: entryId },
        });

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        // Check authorization with company scoping
        const hasAccess = await checkCompanyAccess(entry.userId, req.user.id, req.user.companyId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get edit history
        const history = await prisma.timeEntryEdit.findMany({
            where: { timeEntryId: entryId },
            include: {
                editor: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { editedAt: 'desc' },
        });

        res.json(history);
    } catch (error) {
        console.error('Error fetching edit history:', error);
        res.status(500).json({ error: 'Failed to fetch edit history' });
    }
});

module.exports = router;
