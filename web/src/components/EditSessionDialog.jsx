import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    Stack,
    Box,
    Typography,
    Divider,
    IconButton,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EditSessionDialog = ({ open, onClose, session, onSuccess }) => {
    const { user } = useAuth();
    const locale = user?.company?.country || 'en-US';
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [note, setNote] = useState('');
    const [reason, setReason] = useState('');
    const [breaks, setBreaks] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session) {
            const formatForInput = (date) => {
                if (!date) return '';
                return new Date(date).toISOString().slice(0, 16);
            };

            setStartTime(formatForInput(session.startTime));
            setEndTime(formatForInput(session.endTime));
            setNote(session.note || '');
            setBreaks(session.breaks || []);
            setReason('');
        }
    }, [session]);

    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError('Please provide a reason for this edit');
            return;
        }

        if (!endTime) {
            setError('Cannot edit ongoing session. Please stop it first.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.put(
                `${API_URL}/api/sessions/${session.id}`,
                {
                    startTime: new Date(startTime).toISOString(),
                    endTime: new Date(endTime).toISOString(),
                    note: note || null,
                    reason,
                },
                { withCredentials: true }
            );

            onSuccess(response.data);
            handleClose();
        } catch (err) {
            console.error('Error editing session:', err);
            setError(err.response?.data?.error || 'Failed to edit session');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setError('');
        setReason('');
        onClose();
    };

    if (!session) return null;

    const formatDuration = (hours) => {
        if (!hours) return '0h 0m';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const hasChanges =
        startTime !== new Date(session.startTime).toISOString().slice(0, 16) ||
        (endTime && endTime !== new Date(session.endTime).toISOString().slice(0, 16)) ||
        (note || '') !== (session.note || '');

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Work Session</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    {error && (
                        <Alert severity="error" onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}

                    {session.status !== 'COMPLETED' && (
                        <Alert severity="warning">
                            This session is {session.status.toLowerCase()}. Stop it before editing.
                        </Alert>
                    )}

                    <TextField
                        label="Start Time"
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        disabled={session.status !== 'COMPLETED'}
                    />

                    <TextField
                        label="End Time"
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        disabled={session.status !== 'COMPLETED'}
                    />

                    <TextField
                        label="Note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Optional note about this session"
                    />

                    {breaks.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Breaks (read-only)
                            </Typography>
                            <Stack spacing={1}>
                                {breaks.map((breakItem, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            p: 1.5,
                                            bgcolor: 'action.hover',
                                            borderRadius: 1,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="body2">
                                                {formatTime(breakItem.startTime)} -{' '}
                                                {breakItem.endTime ? formatTime(breakItem.endTime) : 'Ongoing'}
                                            </Typography>
                                            {breakItem.note && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {breakItem.note}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Typography variant="body2" fontWeight="bold">
                                            {formatDuration(breakItem.duration)}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                To edit breaks, please contact an administrator
                            </Typography>
                        </Box>
                    )}

                    <Divider />

                    <TextField
                        label="Reason for Edit"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        fullWidth
                        required
                        multiline
                        rows={2}
                        placeholder="Why are you making this change?"
                        error={!reason.trim() && error !== ''}
                        helperText="Required - explain why you're editing this session"
                    />

                    {hasChanges && (
                        <Alert severity="info">
                            <strong>Summary:</strong>
                            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                {startTime !== new Date(session.startTime).toISOString().slice(0, 16) && (
                                    <li>
                                        Start: {new Date(session.startTime).toLocaleString(locale)} →{' '}
                                        {new Date(startTime).toLocaleString(locale)}
                                    </li>
                                )}
                                {endTime &&
                                    endTime !== new Date(session.endTime).toISOString().slice(0, 16) && (
                                        <li>
                                            End: {new Date(session.endTime).toLocaleString(locale)} →{' '}
                                            {new Date(endTime).toLocaleString(locale)}
                                        </li>
                                    )}
                                {(note || '') !== (session.note || '') && (
                                    <li>Note: "{session.note || ''}" → "{note || ''}"</li>
                                )}
                            </Box>
                        </Alert>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !hasChanges || session.status !== 'COMPLETED'}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditSessionDialog;
