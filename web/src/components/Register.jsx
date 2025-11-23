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
    Container
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Register = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [inviteInfo, setInviteInfo] = useState(null);
    const navigate = useNavigate();
    const { register } = useAuth();

    useEffect(() => {
        if (token) {
            validateInvite(token);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }

        if (!token) {
            return setError('Registration is currently invite-only. Please contact your administrator.');
        }

        setLoading(true);
        try {
            await register(
                formData.email,
                formData.password,
                formData.firstName,
                formData.lastName,
                token
            );
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <Container maxWidth="sm">
                <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Alert severity="info" sx={{ width: '100%' }}>
                        Registration is currently by invite only. Please use the link provided in your invitation email.
                    </Alert>
                    <Button
                        variant="text"
                        onClick={() => navigate('/login')}
                        sx={{ mt: 2 }}
                    >
                        Back to Login
                    </Button>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
                        <Typography variant="h5" component="h1" gutterBottom align="center">
                            Join {inviteInfo ? inviteInfo.companyName : 'Team'}
                        </Typography>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <form onSubmit={handleSubmit}>
                            <TextField
                                label="Email Address"
                                name="email"
                                type="email"
                                fullWidth
                                margin="normal"
                                value={formData.email}
                                disabled // Email is fixed from invite
                                required
                            />
                            <TextField
                                label="First Name"
                                name="firstName"
                                fullWidth
                                margin="normal"
                                value={formData.firstName}
                                onChange={handleChange}
                            />
                            <TextField
                                label="Last Name"
                                name="lastName"
                                fullWidth
                                margin="normal"
                                value={formData.lastName}
                                onChange={handleChange}
                            />
                            <TextField
                                label="Password"
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
                                {loading ? 'Creating Account...' : 'Register'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default Register;
