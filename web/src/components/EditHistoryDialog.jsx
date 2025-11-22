import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Stack,
    Divider,
    CircularProgress,
    Alert,
    Chip,
} from '@mui/material';
import {
    History as HistoryIcon,
    ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EditHistoryDialog = ({ open, onClose, entryId }) => {
    const { user } = useAuth();
    const locale = user?.company?.country || 'en-US';
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && entryId) {
            fetchHistory();
        }
    }, [open, entryId]);

    const fetchHistory = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(
                `${API_URL}/api/entries/${entryId}/history`,
                { withCredentials: true }
            );
            setHistory(response.data);
        } catch (err) {
            console.error('Error fetching history:', err);
            setError(err.response?.data?.error || 'Failed to load edit history');
        } finally {
            setLoading(false);
        }
    };

    const getEditorName = (editor) => {
        if (editor.firstName && editor.lastName) {
            return `${editor.firstName} ${editor.lastName}`;
        }
        if (editor.firstName) return editor.firstName;
        return editor.email;
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderChange = (label, oldValue, newValue) => {
        if (oldValue === newValue) return null;

        // Handle null/undefined values
        const displayOld = oldValue || '(empty)';
        const displayNew = newValue || '(empty)';

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">
                    {label}:
                </Typography>
                <Chip label={displayOld} size="small" color="error" variant="outlined" />
                <ArrowIcon fontSize="small" color="action" />
                <Chip label={displayNew} size="small" color="success" variant="outlined" />
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon />
                    Edit History
                </Box>
            </DialogTitle>
            <DialogContent>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {!loading && !error && history.length === 0 && (
                    <Alert severity="info">
                        No edit history for this entry.
                    </Alert>
                )}

                {!loading && !error && history.length > 0 && (
                    <Stack spacing={2}>
                        {history.map((edit, index) => (
                            <Box
                                key={edit.id}
                                sx={{
                                    p: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    bgcolor: 'background.paper',
                                }}
                            >
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Edited by {getEditorName(edit.editor)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDateTime(edit.editedAt)}
                                    </Typography>
                                </Box>

                                <Stack spacing={1}>
                                    {renderChange(
                                        'Time',
                                        formatDateTime(edit.previousTime),
                                        formatDateTime(edit.newTime)
                                    )}
                                    {renderChange('Type', edit.previousType, edit.newType)}
                                    {renderChange('Note', edit.previousNote, edit.newNote)}
                                </Stack>

                                {edit.reason && (
                                    <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Reason:
                                        </Typography>
                                        <Typography variant="body2">
                                            {edit.reason}
                                        </Typography>
                                    </Box>
                                )}

                                {index < history.length - 1 && <Divider sx={{ mt: 2 }} />}
                            </Box>
                        ))}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditHistoryDialog;
