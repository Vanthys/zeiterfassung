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
    Chip,
    Typography,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EditEntryDialog = ({ open, onClose, entry, onSuccess }) => {
    const { user } = useAuth();
    const locale = user?.company?.country || 'en-US';
    const [time, setTime] = useState('');
    const [note, setNote] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (entry) {
            // Format datetime for input
            const entryDate = new Date(entry.time);
            const formatted = entryDate.toISOString().slice(0, 16);
            setTime(formatted);
            setNote(entry.note || '');
            setReason('');
        }
    }, [entry]);

    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError('Please provide a reason for this edit');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.put(
                `${API_URL}/api/entries/${entry.id}`,
                {
                    time: new Date(time).toISOString(),
                    type: entry.type, // Keep the same type
                    note: note || null,
                    reason,
                },
                { withCredentials: true }
            );

            onSuccess(response.data);
            handleClose();
        } catch (err) {
            console.error('Error editing entry:', err);
            setError(err.response?.data?.error || 'Failed to edit entry');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setError('');
        setReason('');
        onClose();
    };

    if (!entry) return null;

    const hasChanges = time && (
        time !== new Date(entry.time).toISOString().slice(0, 16) ||
        (note || '') !== (entry.note || '')
    );

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    {error && (
                        <Alert severity="error" onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}

                    <Box>
                        <Chip
                            label={`Type: ${entry.type}`}
                            color={entry.type === 'START' ? 'success' : 'error'}
                            sx={{ mb: 2 }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                            Entry type cannot be changed
                        </Typography>
                    </Box>

                    <TextField
                        label="Date & Time"
                        type="datetime-local"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                        label="Note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                    />

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
                        helperText="Required - explain why you're editing this entry"
                    />

                    {hasChanges && (
                        <Alert severity="info">
                            <strong>Changes:</strong>
                            <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                                {time && time !== new Date(entry.time).toISOString().slice(0, 16) && (
                                    <li>
                                        Time: {new Date(entry.time).toLocaleString(locale)} → {new Date(time).toLocaleString(locale)}
                                    </li>
                                )}
                                {(note || '') !== (entry.note || '') && (
                                    <li>Note: "{entry.note || ''}" → "{note || ''}"</li>
                                )}
                            </Box>
                        </Alert>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !hasChanges}
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditEntryDialog;
