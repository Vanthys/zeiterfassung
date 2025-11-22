const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, checkCompanyAccess } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get current ongoing session for authenticated user
router.get('/current', authenticateToken, async (req, res) => {
    try {
        const session = await prisma.workSession.findFirst({
            where: {
                userId: req.user.id,
                status: { in: ['ONGOING', 'PAUSED'] }
            },
            include: {
                breaks: {
                    orderBy: { startTime: 'desc' }
                }
            }
        });

        res.json(session);
    } catch (error) {
        console.error('Error fetching current session:', error);
        res.status(500).json({ error: 'Failed to fetch current session' });
    }
});

// Start a new work session
router.post('/start', authenticateToken, async (req, res) => {
    try {
        const { note, project } = req.body;

        // Check if user already has an ongoing session
        const existingSession = await prisma.workSession.findFirst({
            where: {
                userId: req.user.id,
                status: { in: ['ONGOING', 'PAUSED'] }
            }
        });

        if (existingSession) {
            return res.status(400).json({
                error: 'You already have an ongoing session. Please stop it first.'
            });
        }

        const session = await prisma.workSession.create({
            data: {
                userId: req.user.id,
                startTime: new Date(),
                status: 'ONGOING',
                note,
                project
            },
            include: {
                breaks: true
            }
        });

        res.json(session);
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// Stop current work session
router.post('/:id/stop', authenticateToken, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);
        const { endTime } = req.body;

        const session = await prisma.workSession.findUnique({
            where: { id: sessionId },
            include: { breaks: true }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Authorization check with company scoping
        const hasAccess = await checkCompanyAccess(session.userId, req.user.id, req.user.companyId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (session.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Session is already completed' });
        }

        const stopTime = endTime ? new Date(endTime) : new Date();

        // End any ongoing breaks
        const ongoingBreak = session.breaks.find(b => !b.endTime);
        if (ongoingBreak) {
            const breakDuration = (stopTime - new Date(ongoingBreak.startTime)) / (1000 * 60 * 60);
            await prisma.break.update({
                where: { id: ongoingBreak.id },
                data: {
                    endTime: stopTime,
                    duration: breakDuration
                }
            });
        }

        // Calculate durations
        const totalDuration = (stopTime - new Date(session.startTime)) / (1000 * 60 * 60);

        // Recalculate total break duration
        const allBreaks = await prisma.break.findMany({
            where: { workSessionId: sessionId }
        });
        const breakDuration = allBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
        const netDuration = totalDuration - breakDuration;

        const updatedSession = await prisma.workSession.update({
            where: { id: sessionId },
            data: {
                endTime: stopTime,
                status: 'COMPLETED',
                totalDuration,
                breakDuration,
                netDuration
            },
            include: {
                breaks: {
                    orderBy: { startTime: 'asc' }
                }
            }
        });

        res.json(updatedSession);
    } catch (error) {
        console.error('Error stopping session:', error);
        res.status(500).json({ error: 'Failed to stop session' });
    }
});

// Start a break
router.post('/:id/break/start', authenticateToken, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);
        const { type, note } = req.body;

        const session = await prisma.workSession.findUnique({
            where: { id: sessionId },
            include: { breaks: true }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Authorization check with company scoping
        const hasAccess = await checkCompanyAccess(session.userId, req.user.id, req.user.companyId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (session.status !== 'ONGOING') {
            return res.status(400).json({ error: 'Can only start break during an ongoing session' });
        }

        // Check if there's already an ongoing break
        const ongoingBreak = session.breaks.find(b => !b.endTime);
        if (ongoingBreak) {
            return res.status(400).json({ error: 'Break already in progress' });
        }

        const breakRecord = await prisma.break.create({
            data: {
                workSessionId: sessionId,
                startTime: new Date(),
                type: type || 'UNPAID',
                note
            }
        });

        // Update session status to PAUSED
        await prisma.workSession.update({
            where: { id: sessionId },
            data: { status: 'PAUSED' }
        });

        res.json(breakRecord);
    } catch (error) {
        console.error('Error starting break:', error);
        res.status(500).json({ error: 'Failed to start break' });
    }
});

// End a break
router.post('/:id/break/end', authenticateToken, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);

        const session = await prisma.workSession.findUnique({
            where: { id: sessionId },
            include: { breaks: true }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Authorization check with company scoping
        const hasAccess = await checkCompanyAccess(session.userId, req.user.id, req.user.companyId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const ongoingBreak = session.breaks.find(b => !b.endTime);
        if (!ongoingBreak) {
            return res.status(400).json({ error: 'No ongoing break found' });
        }

        const endTime = new Date();
        const duration = (endTime - new Date(ongoingBreak.startTime)) / (1000 * 60 * 60);

        const updatedBreak = await prisma.break.update({
            where: { id: ongoingBreak.id },
            data: {
                endTime,
                duration
            }
        });

        // Update session status back to ONGOING
        await prisma.workSession.update({
            where: { id: sessionId },
            data: { status: 'ONGOING' }
        });

        res.json(updatedBreak);
    } catch (error) {
        console.error('Error ending break:', error);
        res.status(500).json({ error: 'Failed to end break' });
    }
});

// Get user's recent sessions
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const { limit = 30, offset = 0 } = req.query;

        const sessions = await prisma.workSession.findMany({
            where: { userId: req.user.id },
            include: {
                breaks: {
                    orderBy: { startTime: 'asc' }
                }
            },
            orderBy: { startTime: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Get specific session
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);

        const session = await prisma.workSession.findUnique({
            where: { id: sessionId },
            include: {
                breaks: {
                    orderBy: { startTime: 'asc' }
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Authorization check with company scoping
        const hasAccess = await checkCompanyAccess(session.userId, req.user.id, req.user.companyId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json(session);
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// Edit a session (admin or owner)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);
        const { startTime, endTime, note, project, reason } = req.body;

        const session = await prisma.workSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Authorization check with company scoping
        const hasAccess = await checkCompanyAccess(session.userId, req.user.id, req.user.companyId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (session.status === 'ONGOING' || session.status === 'PAUSED') {
            return res.status(400).json({ error: 'Cannot edit ongoing session. Stop it first.' });
        }

        // Create edit history
        const changes = {
            startTime: { old: session.startTime, new: startTime ? new Date(startTime) : session.startTime },
            endTime: { old: session.endTime, new: endTime ? new Date(endTime) : session.endTime },
            note: { old: session.note, new: note !== undefined ? note : session.note },
            project: { old: session.project, new: project !== undefined ? project : session.project }
        };

        await prisma.workSessionEdit.create({
            data: {
                workSessionId: sessionId,
                editedBy: req.user.id,
                changes: JSON.stringify(changes),
                reason
            }
        });

        // Recalculate durations
        const newStartTime = startTime ? new Date(startTime) : new Date(session.startTime);
        const newEndTime = endTime ? new Date(endTime) : new Date(session.endTime);
        const totalDuration = (newEndTime - newStartTime) / (1000 * 60 * 60);
        const netDuration = totalDuration - session.breakDuration;

        const updatedSession = await prisma.workSession.update({
            where: { id: sessionId },
            data: {
                startTime: newStartTime,
                endTime: newEndTime,
                note: note !== undefined ? note : session.note,
                project: project !== undefined ? project : session.project,
                totalDuration,
                netDuration
            },
            include: {
                breaks: true
            }
        });

        res.json(updatedSession);
    } catch (error) {
        console.error('Error editing session:', error);
        res.status(500).json({ error: 'Failed to edit session' });
    }
});

// Delete a session
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);

        const session = await prisma.workSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Authorization check with company scoping
        const hasAccess = await checkCompanyAccess(session.userId, req.user.id, req.user.companyId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.workSession.delete({
            where: { id: sessionId }
        });

        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

module.exports = router;
