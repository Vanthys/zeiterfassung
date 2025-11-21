const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');

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
 * Get all time entries (admin only)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const entries = await prisma.timeEntry.findMany({
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

        // Check authorization
        if (req.user.role !== 'ADMIN' && entry.userId !== req.user.id) {
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

module.exports = router;
