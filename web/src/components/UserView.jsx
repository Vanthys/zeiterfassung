import React, { useState, useEffect } from 'react';
import {
    Paper,
    Button,
    Typography,
    Stack,
    Alert,
    Box,
    Card,
    CardContent,
} from '@mui/material';
import {
    PlayArrow as StartIcon,
    Stop as StopIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import EntryList from './EntryList';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const UserView = () => {
    const { user } = useAuth();
    const [canStart, setCanStart] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        checkCanStart();
    }, [refresh]);

    const checkCanStart = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/entries/canstart`,
                { withCredentials: true }
            );
            setCanStart(response.data.canStart);
        } catch (error) {
            console.error('Error checking status:', error);
        }
    };

    const handleAction = async () => {
        setLoading(true);
        setError('');
        try {
            await axios.post(
                `${API_URL}/api/entries`,
                {
                    type: canStart ? 'START' : 'STOP',
                    time: new Date().toISOString()
                },
                { withCredentials: true }
            );
            setRefresh(prev => prev + 1);
        } catch (error) {
            console.error('Error:', error);
            setError(error.response?.data?.error || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getDisplayName = () => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        if (user?.firstName) return user.firstName;
        if (user?.email) return user.email.split('@')[0];
        return 'User';
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Time Tracking
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Stack spacing={3}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Current Status
                        </Typography>
                        <Stack spacing={2}>
                            <Box
                                sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    bgcolor: canStart ? 'error.light' : 'success.light',
                                    color: canStart ? 'error.contrastText' : 'success.contrastText',
                                    textAlign: 'center',
                                }}
                            >
                                <Typography variant="h5">
                                    {canStart ? 'Currently Offline' : 'Currently Working'}
                                </Typography>
                            </Box>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                color={canStart ? "success" : "error"}
                                startIcon={canStart ? <StartIcon /> : <StopIcon />}
                                onClick={handleAction}
                                disabled={loading}
                                sx={{
                                    py: 2,
                                    fontSize: '1.2rem',
                                }}
                            >
                                {loading ? 'Processing...' : (canStart ? 'Start Working' : 'Stop Working')}
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>

                <EntryList refresh={refresh} />
            </Stack>
        </Box>
    );
};

export default UserView;
