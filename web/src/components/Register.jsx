import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    Container,
    Tabs,
    Tab,
    MenuItem
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Register = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { t } = useTranslation();

    const [tabValue, setTabValue] = useState(token ? 1 : 0); // 0 = company signup, 1 = invite
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        companyName: '',
        country: 'en-US',
        address: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [inviteInfo, setInviteInfo] = useState(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        if (token) {
            validateInvite(token);
            setTabValue(1);
        }
    }, [token]);

    const validateInvite = async (inviteToken) => {
        try {
            const response = await axios.get(`${API_URL}/api/invites/${inviteToken}`);
            setInviteInfo(response.data);
            setFormData(prev => ({ ...prev, email: response.data.email }));
        } catch (err) {
            setError('Invalid or expired invite link.');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setError('');
    };

    const handleCompanySignup = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }

        if (!formData.companyName.trim()) {
            return setError('Company name is required');
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/auth/register-company`, {
                email: formData.email,
                password: formData.password,
                companyName: formData.companyName,
                firstName: formData.firstName || null,
                lastName: formData.lastName || null,
                country: formData.country || null,
                address: formData.address || null,
            }, { withCredentials: true });

            // Login with the returned token
            if (response.data.user) {
                await login(formData.email, formData.password);
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create company');
        } finally {
            setLoading(false);
        }
    };

    const handleInviteSignup = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }

        if (!token) {
            return setError('Invalid invite link');
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/auth/register`, {
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName || null,
                lastName: formData.lastName || null,
                token,
            }, { withCredentials: true });

            if (response.data.user) {
                await login(formData.email, formData.password);
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
                        <Typography variant="h5" component="h1" gutterBottom align="center">
                            {t('auth.register')}
                        </Typography>

                        {!token && (
                            <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 2 }}>
                                <Tab label="Create Company" />
                                <Tab label="Join with Invite" disabled />
                            </Tabs>
                        )}

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        {/* Company Signup Form */}
                        {tabValue === 0 && (
                            <form onSubmit={handleCompanySignup}>
                                <TextField
                                    label={t('auth.companyName')}
                                    name="companyName"
                                    fullWidth
                                    margin="normal"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    required
                                />
                                <TextField
                                    label={t('auth.email')}
                                    name="email"
                                    type="email"
                                    fullWidth
                                    margin="normal"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                                <TextField
                                    label={t('auth.firstName')}
                                    name="firstName"
                                    fullWidth
                                    margin="normal"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                />
                                <TextField
                                    label={t('auth.lastName')}
                                    name="lastName"
                                    fullWidth
                                    margin="normal"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                />
                                <TextField
                                    label="Locale / Region"
                                    name="country"
                                    select
                                    fullWidth
                                    margin="normal"
                                    value={formData.country}
                                    onChange={handleChange}
                                    helperText="Used for date, time, and number formatting"
                                >
                                    <MenuItem value="en-US">English (United States)</MenuItem>
                                    <MenuItem value="de-DE">Deutsch (Germany)</MenuItem>
                                    <MenuItem value="en-GB">English (United Kingdom)</MenuItem>
                                    <MenuItem value="fr-FR">Français (France)</MenuItem>
                                    <MenuItem value="es-ES">Español (Spain)</MenuItem>
                                </TextField>
                                <TextField
                                    label="Address (optional)"
                                    name="address"
                                    fullWidth
                                    margin="normal"
                                    value={formData.address}
                                    onChange={handleChange}
                                    multiline
                                    rows={2}
                                />
                                <TextField
                                    label={t('auth.password')}
                                    name="password"
                                    type="password"
                                    fullWidth
                                    margin="normal"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    helperText="Minimum 6 characters"
                                />
                                <TextField
                                    label="Confirm Password"
                                    name="confirmPassword"
                                    type="password"
                                    fullWidth
                                    margin="normal"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 3, mb: 2 }}
                                    disabled={loading}
                                >
                                    {loading ? 'Creating Company...' : 'Create Company & Sign Up'}
                                </Button>
                            </form>
                        )}

                        {/* Invite Signup Form */}
                        {tabValue === 1 && (
                            <form onSubmit={handleInviteSignup}>
                                {inviteInfo && (
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        You're joining {inviteInfo.companyName}
                                    </Alert>
                                )}
                                <TextField
                                    label={t('auth.email')}
                                    name="email"
                                    type="email"
                                    fullWidth
                                    margin="normal"
                                    value={formData.email}
                                    disabled
                                    required
                                />
                                <TextField
                                    label={t('auth.firstName')}
                                    name="firstName"
                                    fullWidth
                                    margin="normal"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                />
                                <TextField
                                    label={t('auth.lastName')}
                                    name="lastName"
                                    fullWidth
                                    margin="normal"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                />
                                <TextField
                                    label={t('auth.password')}
                                    name="password"
                                    type="password"
                                    fullWidth
                                    margin="normal"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <TextField
                                    label="Confirm Password"
                                    name="confirmPassword"
                                    type="password"
                                    fullWidth
                                    margin="normal"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 3, mb: 2 }}
                                    disabled={loading}
                                >
                                    {loading ? 'Creating Account...' : 'Join Company'}
                                </Button>
                            </form>
                        )}

                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => navigate('/login')}
                            sx={{ mt: 1 }}
                        >
                            {t('auth.hasAccount')}
                        </Button>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default Register;
