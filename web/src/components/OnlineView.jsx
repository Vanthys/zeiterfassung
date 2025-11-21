import { Paper, Stack, Typography, Box, Chip } from "@mui/material";
import axios from "axios";
import { useState, useEffect } from "react";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { format } from "date-fns";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const OnlineView = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await axios.get(
                    `${API_URL}/api/users/online`,
                    { withCredentials: true }
                );
                setUsers(response.data);
            } catch (error) {
                console.error("Error getting users: ", error);
            } finally {
                setLoading(false);
            }
        };

        loadUsers();

        // Refresh every 30 seconds
        const interval = setInterval(loadUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatDuration = (startTime) => {
        const now = new Date();
        const start = new Date(startTime);
        const diff = now - start;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    if (loading) {
        return <Typography>Loading...</Typography>;
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Online Status
            </Typography>

            <Stack spacing={2}>
                {users.map((user) => {
                    const displayName = user.firstName || user.email?.split('@')[0] || 'User';
                    const isOnline = user.online;

                    return (
                        <Paper key={user.id} elevation={2} sx={{ p: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h6">
                                        {displayName}
                                        {user.lastName && ` ${user.lastName}`}
                                    </Typography>
                                    {isOnline ? (
                                        <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                            <Chip
                                                label="Working"
                                                color="success"
                                                size="small"
                                                icon={<CheckCircleIcon />}
                                            />
                                            <Typography variant="body2" color="text.secondary">
                                                seit {format(new Date(user.time), 'HH:mm')} ({formatDuration(user.time)})
                                            </Typography>
                                        </Stack>
                                    ) : (
                                        <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                            <Chip
                                                label="Offline"
                                                color="default"
                                                size="small"
                                                icon={<CancelIcon />}
                                            />
                                            <Typography variant="body2" color="text.secondary">
                                                {user.time ? `zuletzt: ${format(new Date(user.time), 'HH:mm')}` : 'nie'}
                                            </Typography>
                                        </Stack>
                                    )}
                                </Box>
                            </Stack>
                        </Paper>
                    );
                })}

                {users.length === 0 && (
                    <Paper sx={{ p: 3 }}>
                        <Typography color="text.secondary" textAlign="center">
                            Keine Benutzer gefunden
                        </Typography>
                    </Paper>
                )}
            </Stack>
        </Box>
    );
};

export default OnlineView;