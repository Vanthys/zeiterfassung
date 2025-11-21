import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Stack,
    IconButton,
    Collapse,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import EditSessionDialog from './EditSessionDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DataView = () => {
    const { user, isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(user?.id || '');
    const [sessions, setSessions] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAdmin()) {
            fetchUsers();
        }
    }, []);

    useEffect(() => {
        if (selectedUserId) {
            fetchSessions();
        }
    }, [selectedUserId]);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/users`, {
                withCredentials: true
            });
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const fetchSessions = async () => {
        setLoading(true);
        setError('');
        try {
            const endpoint = isAdmin() && selectedUserId !== user.id
                ? `/api/stats/sessions/${selectedUserId}`
                : '/api/stats/sessions';

            const response = await axios.get(`${API_URL}${endpoint}?limit=100`, {
                withCredentials: true
            });
            setSessions(response.data);
        } catch (err) {
            console.error('Error fetching sessions:', err);
            setError('Failed to load work sessions');
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (sessionId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(sessionId)) {
            newExpanded.delete(sessionId);
        } else {
            newExpanded.add(sessionId);
        }
        setExpandedRows(newExpanded);
    };

    const handleEditSession = (session) => {
        setSelectedSession(session);
        setEditDialogOpen(true);
    };

    const handleEditSuccess = () => {
        fetchSessions();
        setEditDialogOpen(false);
        setSelectedSession(null);
    };

    const handleDeleteSession = (session) => {
        setSelectedSession(session);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedSession) return;

        setLoading(true);
        setError('');
        try {
            await axios.delete(`${API_URL}/api/sessions/${selectedSession.id}`, {
                withCredentials: true
            });
            setDeleteDialogOpen(false);
            setSelectedSession(null);
            fetchSessions();
        } catch (err) {
            console.error('Error deleting session:', err);
            setError(err.response?.data?.error || 'Failed to delete session');
            setDeleteDialogOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (hours) => {
        if (!hours) return '0h 0m';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    // Group sessions by date
    const sessionsByDate = sessions.reduce((acc, session) => {
        const date = new Date(session.startTime).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(session);
        return acc;
    }, {});

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Work History
            </Typography>

            {isAdmin() && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <FormControl fullWidth>
                            <InputLabel>Select User</InputLabel>
                            <Select
                                value={selectedUserId}
                                label="Select User"
                                onChange={(e) => setSelectedUserId(e.target.value)}
                            >
                                {users.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>
                                        {u.firstName && u.lastName
                                            ? `${u.firstName} ${u.lastName}`
                                            : u.email}
                                        {u.role === 'ADMIN' && ' (Admin)'}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </CardContent>
                </Card>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Typography>Loading...</Typography>
            ) : sessions.length === 0 ? (
                <Card>
                    <CardContent>
                        <Typography color="text.secondary">
                            No work sessions found. Start working to see your history!
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <Stack spacing={3}>
                    {Object.entries(sessionsByDate).map(([date, dateSessions]) => {
                        const totalNet = dateSessions.reduce((sum, s) => sum + (s.netDuration || 0), 0);
                        const totalBreaks = dateSessions.reduce((sum, s) => sum + (s.breakDuration || 0), 0);

                        return (
                            <Card key={date}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6">{date}</Typography>
                                        <Stack direction="row" spacing={2}>
                                            <Chip
                                                label={`Net: ${formatDuration(totalNet)}`}
                                                color="primary"
                                            />
                                            {totalBreaks > 0 && (
                                                <Chip
                                                    label={`Breaks: ${formatDuration(totalBreaks)}`}
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                    </Stack>

                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell width="50px"></TableCell>
                                                    <TableCell>Start</TableCell>
                                                    <TableCell>End</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell align="right">Total</TableCell>
                                                    <TableCell align="right">Breaks</TableCell>
                                                    <TableCell align="right">Net</TableCell>
                                                    <TableCell align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {dateSessions.map((session) => (
                                                    <React.Fragment key={session.id}>
                                                        <TableRow hover>
                                                            <TableCell>
                                                                {session.breaks && session.breaks.length > 0 && (
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => toggleRow(session.id)}
                                                                    >
                                                                        {expandedRows.has(session.id) ? (
                                                                            <ExpandLessIcon />
                                                                        ) : (
                                                                            <ExpandMoreIcon />
                                                                        )}
                                                                    </IconButton>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>{formatTime(session.startTime)}</TableCell>
                                                            <TableCell>
                                                                {session.endTime ? formatTime(session.endTime) : '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={session.status}
                                                                    size="small"
                                                                    color={
                                                                        session.status === 'COMPLETED'
                                                                            ? 'success'
                                                                            : session.status === 'ONGOING'
                                                                                ? 'info'
                                                                                : 'warning'
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                {formatDuration(session.totalDuration)}
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                {formatDuration(session.breakDuration)}
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <strong>{formatDuration(session.netDuration)}</strong>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                {session.status === 'COMPLETED' && (
                                                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleEditSession(session)}
                                                                            title="Edit session"
                                                                        >
                                                                            <EditIcon fontSize="small" />
                                                                        </IconButton>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleDeleteSession(session)}
                                                                            title="Delete session"
                                                                            color="error"
                                                                        >
                                                                            <DeleteIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </Stack>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                        {session.breaks && session.breaks.length > 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={8} sx={{ py: 0, px: 0 }}>
                                                                    <Collapse
                                                                        in={expandedRows.has(session.id)}
                                                                        timeout="auto"
                                                                        unmountOnExit
                                                                    >
                                                                        <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                                                                            <Typography variant="subtitle2" gutterBottom>
                                                                                Breaks:
                                                                            </Typography>
                                                                            <Stack spacing={1}>
                                                                                {session.breaks.map((breakItem, idx) => (
                                                                                    <Box
                                                                                        key={idx}
                                                                                        sx={{
                                                                                            display: 'flex',
                                                                                            justifyContent: 'space-between',
                                                                                            alignItems: 'center',
                                                                                            p: 1,
                                                                                            bgcolor: 'background.paper',
                                                                                            borderRadius: 1,
                                                                                        }}
                                                                                    >
                                                                                        <Typography variant="body2">
                                                                                            {formatTime(breakItem.startTime)} -{' '}
                                                                                            {breakItem.endTime
                                                                                                ? formatTime(breakItem.endTime)
                                                                                                : 'Ongoing'}
                                                                                            {breakItem.note && ` (${breakItem.note})`}
                                                                                        </Typography>
                                                                                        <Chip
                                                                                            label={formatDuration(breakItem.duration)}
                                                                                            size="small"
                                                                                            variant="outlined"
                                                                                        />
                                                                                    </Box>
                                                                                ))}
                                                                            </Stack>
                                                                        </Box>
                                                                    </Collapse>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Stack>
            )}

            <EditSessionDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                session={selectedSession}
                onSuccess={handleEditSuccess}
            />

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Session?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this work session? This action cannot be undone.
                        {selectedSession && (
                            <>
                                <br /><br />
                                <strong>Session Details:</strong><br />
                                Date: {new Date(selectedSession.startTime).toLocaleDateString()}<br />
                                Time: {formatTime(selectedSession.startTime)} - {selectedSession.endTime ? formatTime(selectedSession.endTime) : 'Ongoing'}<br />
                                Net Duration: {formatDuration(selectedSession.netDuration)}
                            </>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={loading}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DataView;
