import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Alert,
    Chip,
    Stack,
    Tooltip
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    Refresh as RefreshIcon,
    Send as SendIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const InviteManager = () => {
    const { isAdmin, user } = useAuth();
    const { t } = useTranslation();
    const locale = user?.company?.country || 'en-US';
    const [invites, setInvites] = useState([]);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [lastInvite, setLastInvite] = useState(null);

    useEffect(() => {
        fetchInvites();
    }, []);

    const fetchInvites = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/invites`, {
                withCredentials: true
            });
            setInvites(response.data);
        } catch (err) {
            console.error('Error fetching invites:', err);
        }
    };

    const handleCreateInvite = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        setLastInvite(null);

        try {
            const response = await axios.post(
                `${API_URL}/api/invites`,
                { email },
                { withCredentials: true }
            );

            setSuccess(`Invite created for ${email}`);
            setLastInvite({
                email,
                token: response.data.token,
                link: response.data.inviteLink,
                createdAt: new Date()
            });
            setEmail('');
            fetchInvites(); // Refresh list
        } catch (err) {
            console.error('Error creating invite:', err);
            setError(err.response?.data?.error || 'Failed to create invite');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Could add a snackbar here for feedback
    };

    if (!isAdmin()) {
        return <Alert severity="error">Access Denied</Alert>;
    }

    return (
        <Box maxWidth="md" mx="auto">
            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        {t('invites.inviteUser')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" component="p" style={{ marginBottom: '1rem' }}>
                        {t('invites.description')}
                    </Typography>

                    <form onSubmit={handleCreateInvite}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                            <TextField
                                label={t('invites.email')}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                fullWidth
                                placeholder="new.employee@company.com"
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={loading}
                                startIcon={<SendIcon />}
                                sx={{ minWidth: 120, height: 56 }}
                            >
                                {loading ? t('invites.creating') : t('invites.create')}
                            </Button>
                        </Stack>
                    </form>

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            {success}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {lastInvite && (
                <Card sx={{ bgcolor: 'action.hover', mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            {t('invites.inviteCreated')}
                        </Typography>

                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('invites.inviteLink')}
                            </Typography>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    bgcolor: 'background.paper',
                                    mt: 1
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontFamily: 'monospace',
                                        wordBreak: 'break-all',
                                        mr: 2
                                    }}
                                >
                                    {lastInvite.link}
                                </Typography>
                                <Tooltip title="Copy Link">
                                    <IconButton onClick={() => copyToClipboard(lastInvite.link)} color="primary">
                                        <CopyIcon />
                                    </IconButton>
                                </Tooltip>
                            </Paper>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                {t('invites.shareText', { email: lastInvite.email })}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            )}

            <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                {t('invites.activeInvites')}
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('invites.email')}</TableCell>
                            <TableCell>{t('invites.created')}</TableCell>
                            <TableCell>{t('invites.expires')}</TableCell>
                            <TableCell align="right">{t('common.actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {invites.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    {t('invites.noActiveInvites')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            invites.map((invite) => (
                                <TableRow key={invite.id}>
                                    <TableCell>{invite.email}</TableCell>
                                    <TableCell>{new Date(invite.createdAt).toLocaleDateString(locale)}</TableCell>
                                    <TableCell>{new Date(invite.expiresAt).toLocaleDateString(locale)}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Copy Link">
                                            <IconButton onClick={() => copyToClipboard(invite.link)} size="small">
                                                <CopyIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default InviteManager;
