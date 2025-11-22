import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    LinearProgress,
    Grid,
    Chip,
    Stack,
    Alert,
    Divider,
} from '@mui/material';
import {
    PlayArrow as StartIcon,
    Stop as StopIcon,
    Coffee as BreakIcon,
    Timer as TimerIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
    const { user } = useAuth();
    const [currentSession, setCurrentSession] = useState(null);
    const [recentSessions, setRecentSessions] = useState([]);
    const [weeklyStats, setWeeklyStats] = useState({ hours: 0, target: 40 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());

    const locale = user?.company?.country || 'en-US';

    // Update current time every second for live timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch current session and recent sessions
    useEffect(() => {
        fetchCurrentSession();
        fetchRecentSessions();
        fetchWeeklyStats();
    }, []);

    const fetchCurrentSession = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/sessions/current`, {
                withCredentials: true
            });
            setCurrentSession(response.data);
        } catch (err) {
            console.error('Error fetching current session:', err);
        }
    };

    const fetchRecentSessions = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/sessions/me?limit=5`, {
                withCredentials: true
            });
            setRecentSessions(response.data);
        } catch (err) {
            console.error('Error fetching recent sessions:', err);
        }
    };

    const fetchWeeklyStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/stats/weekly?weeks=1`, {
                withCredentials: true
            });

            // API returns { weeks: [...], target: 40 }
            const currentWeek = response.data.weeks?.[0];
            setWeeklyStats({
                hours: currentWeek?.hours || 0,
                target: response.data.target || user?.weeklyHoursTarget || 40
            });
        } catch (err) {
            console.error('Error fetching weekly stats:', err);
            // Use default if stats endpoint not ready
            setWeeklyStats({ hours: 0, target: user?.weeklyHoursTarget || 40 });
        }
    };

    const handleStartWork = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post(
                `${API_URL}/api/sessions/start`,
                {},
                { withCredentials: true }
            );
            setCurrentSession(response.data);
            fetchRecentSessions();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to start session');
        } finally {
            setLoading(false);
        }
    };

    const handleStopWork = async () => {
        if (!currentSession) return;

        setLoading(true);
        setError('');
        try {
            await axios.post(
                `${API_URL}/api/sessions/${currentSession.id}/stop`,
                {},
                { withCredentials: true }
            );
            setCurrentSession(null);
            fetchRecentSessions();
            fetchWeeklyStats();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to stop session');
        } finally {
            setLoading(false);
        }
    };

    const handleStartBreak = async () => {
        if (!currentSession) return;

        setLoading(true);
        setError('');
        try {
            await axios.post(
                `${API_URL}/api/sessions/${currentSession.id}/break/start`,
                { type: 'UNPAID', note: 'Break' },
                { withCredentials: true }
            );
            fetchCurrentSession();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to start break');
        } finally {
            setLoading(false);
        }
    };

    const handleEndBreak = async () => {
        if (!currentSession) return;

        setLoading(true);
        setError('');
        try {
            await axios.post(
                `${API_URL}/api/sessions/${currentSession.id}/break/end`,
                {},
                { withCredentials: true }
            );
            fetchCurrentSession();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to end break');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString(locale, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDuration = (startTime, endTime = null) => {
        const start = new Date(startTime);
        const end = endTime ? new Date(endTime) : currentTime;
        const diff = Math.max(0, end - start); // Ensure non-negative

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        }
        return `${minutes}m ${seconds}s`;
    };

    const getOngoingBreak = () => {
        if (!currentSession?.breaks) return null;
        return currentSession.breaks.find(b => !b.endTime);
    };

    const ongoingBreak = getOngoingBreak();
    const isOnBreak = currentSession?.status === 'PAUSED';
    const isWorking = currentSession?.status === 'ONGOING';

    return (
        <Box>
            {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Current Status Card */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Current Status
                            </Typography>

                            {!currentSession && (
                                <Box textAlign="center" py={3}>
                                    <Chip
                                        label="Offline"
                                        color="default"
                                        sx={{ mb: 3, fontSize: '1.1rem', py: 2.5 }}
                                    />
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="large"
                                        fullWidth
                                        startIcon={<StartIcon />}
                                        onClick={handleStartWork}
                                        disabled={loading}
                                    >
                                        Start Working
                                    </Button>
                                </Box>
                            )}

                            {isWorking && (
                                <Box>
                                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                                        <Chip
                                            label="Working"
                                            color="success"
                                            icon={<TimerIcon />}
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                            Started at {formatTime(currentSession.startTime)}
                                        </Typography>
                                    </Stack>

                                    <Typography variant="h3" gutterBottom textAlign="center" color="primary">
                                        {formatDuration(currentSession.startTime)}
                                    </Typography>

                                    <Stack spacing={2} mt={3}>
                                        <Button
                                            variant="outlined"
                                            color="warning"
                                            fullWidth
                                            startIcon={<BreakIcon />}
                                            onClick={handleStartBreak}
                                            disabled={loading}
                                        >
                                            Take Break
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            fullWidth
                                            startIcon={<StopIcon />}
                                            onClick={handleStopWork}
                                            disabled={loading}
                                        >
                                            Stop Working
                                        </Button>
                                    </Stack>
                                </Box>
                            )}

                            {isOnBreak && ongoingBreak && (
                                <Box>
                                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                                        <Chip
                                            label="On Break"
                                            color="warning"
                                            icon={<BreakIcon />}
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                            Started at {formatTime(ongoingBreak.startTime)}
                                        </Typography>
                                    </Stack>

                                    <Typography variant="h3" gutterBottom textAlign="center" color="warning.main">
                                        {formatDuration(ongoingBreak.startTime)}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
                                        Work time: {formatDuration(currentSession.startTime, ongoingBreak.startTime)}
                                    </Typography>

                                    <Button
                                        variant="contained"
                                        color="success"
                                        fullWidth
                                        onClick={handleEndBreak}
                                        disabled={loading}
                                    >
                                        End Break
                                    </Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Weekly Progress Card */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                This Week
                            </Typography>

                            <Box mb={2}>
                                <Stack direction="row" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" color="text.secondary">
                                        Progress
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {weeklyStats.hours?.toFixed(1) ?? 0}h / {weeklyStats.target}h
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min((weeklyStats.hours / weeklyStats.target) * 100, 100)}
                                    sx={{ height: 10, borderRadius: 5 }}
                                />
                                <Typography variant="caption" color="text.secondary" mt={0.5}>
                                    {Math.round((weeklyStats.hours / weeklyStats.target) * 100)}% complete
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Sessions */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Recent Sessions
                            </Typography>

                            {recentSessions.length === 0 ? (
                                <Typography color="text.secondary">
                                    No sessions yet. Start working to see your history!
                                </Typography>
                            ) : (
                                <Stack spacing={2} divider={<Divider />}>
                                    {recentSessions.map((session) => (
                                        <Box key={session.id}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography variant="body1" fontWeight="bold">
                                                        {formatDate(session.startTime)}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'Ongoing'}
                                                    </Typography>
                                                    {session.breaks?.length > 0 && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {session.breaks.length} break(s)
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Box textAlign="right">
                                                    {session.status === 'COMPLETED' ? (
                                                        <>
                                                            <Typography variant="h6" color="primary">
                                                                {session.netDuration?.toFixed(2) ?? 0}h
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                net time
                                                            </Typography>
                                                        </>
                                                    ) : (
                                                        <Chip label={session.status} size="small" color="info" />
                                                    )}
                                                </Box>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
