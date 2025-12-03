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
import { Save as SaveIcon, Lock as LockIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Settings = () => {
    const { user, checkAuth } = useAuth();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        weeklyHoursTarget: 40,
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const { t } = useTranslation();

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

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
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

            setSuccess(t("settings.profileSuccess"));
            await checkAuth(); // Refresh user data in context
        } catch (err) {
            console.error('Error updating settings:', err);
            setError(err.response?.data?.error || 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordLoading(true);
        setPasswordError('');
        setPasswordSuccess('');

        // Client-side validation
        if (passwordData.newPassword.length < 6) {
            setPasswordError(t("settings.passwordTooShort"));
            setPasswordLoading(false);
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError(t("settings.passwordMismatch"));
            setPasswordLoading(false);
            return;
        }

        try {
            await axios.post(
                `${API_URL}/api/auth/change-password`,
                {
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                },
                { withCredentials: true }
            );

            setPasswordSuccess(t("settings.passwordChangeSuccess"));
            // Clear password fields
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (err) {
            console.error('Error changing password:', err);
            setPasswordError(err.response?.data?.error || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <Box maxWidth="md" mx="auto">
            <Stack spacing={3}>
                {/* Profile Settings Card */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            {t("settings.profile")}
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
                                        label={t("settings.firstName")}
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        fullWidth
                                    />
                                    <TextField
                                        label={t("settings.lastName")}
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        fullWidth
                                    />
                                </Stack>

                                <TextField
                                    label={t("settings.weeklyHoursTarget")}
                                    name="weeklyHoursTarget"
                                    type="number"
                                    value={formData.weeklyHoursTarget}
                                    onChange={handleChange}
                                    inputProps={{ min: 0, step: 0.5 }}
                                    helperText={t("settings.weeklyHoursTargetHelperText")}
                                    fullWidth
                                />

                                <Box display="flex" justifyContent="flex-end">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<SaveIcon />}
                                        disabled={loading}
                                    >
                                        {t("common.save")}
                                    </Button>
                                </Box>
                            </Stack>
                        </form>
                    </CardContent>
                </Card>

                {/* Password Change Card */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            {t("settings.changePassword")}
                        </Typography>
                        <Divider sx={{ mb: 3 }} />

                        {passwordSuccess && (
                            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setPasswordSuccess('')}>
                                {passwordSuccess}
                            </Alert>
                        )}

                        {passwordError && (
                            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setPasswordError('')}>
                                {passwordError}
                            </Alert>
                        )}

                        <form onSubmit={handlePasswordSubmit}>
                            <Stack spacing={3}>
                                <TextField
                                    label={t("settings.currentPassword")}
                                    name="currentPassword"
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    helperText={t("settings.currentPasswordHelperText")}
                                    required
                                    fullWidth
                                />

                                <TextField
                                    label={t("settings.newPassword")}
                                    name="newPassword"
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    fullWidth
                                />

                                <TextField
                                    label={t("settings.confirmPassword")}
                                    name="confirmPassword"
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    fullWidth
                                />

                                <Box display="flex" justifyContent="flex-end">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<LockIcon />}
                                        disabled={passwordLoading}
                                    >
                                        {t("settings.changePassword")}
                                    </Button>
                                </Box>
                            </Stack>
                        </form>
                    </CardContent>
                </Card>
            </Stack>
        </Box>
    );
};

export default Settings;
