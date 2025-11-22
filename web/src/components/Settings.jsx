import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    Stack,
    Divider,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Settings = () => {
    const { user, checkAuth } = useAuth();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        weeklyHoursTarget: 40,
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                weeklyHoursTarget: user.weeklyHoursTarget || 40,
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.put(
                `${API_URL}/api/users/${user.id}`,
                {
                    ...formData,
                    weeklyHoursTarget: parseFloat(formData.weeklyHoursTarget)
                },
                { withCredentials: true }
            );

            setSuccess('Settings updated successfully');
            await checkAuth(); // Refresh user data in context
        } catch (err) {
            console.error('Error updating settings:', err);
            setError(err.response?.data?.error || 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box maxWidth="md" mx="auto">

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Profile Settings
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    {success && (
                        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
                            {success}
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="First Name"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    fullWidth
                                />
                                <TextField
                                    label="Last Name"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    fullWidth
                                />
                            </Stack>

                            <TextField
                                label="Weekly Hours Target"
                                name="weeklyHoursTarget"
                                type="number"
                                value={formData.weeklyHoursTarget}
                                onChange={handleChange}
                                inputProps={{ min: 0, step: 0.5 }}
                                helperText="Target hours for weekly progress calculation"
                                fullWidth
                            />

                            <Box display="flex" justifyContent="flex-end">
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    disabled={loading}
                                >
                                    Save Changes
                                </Button>
                            </Box>
                        </Stack>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Settings;
