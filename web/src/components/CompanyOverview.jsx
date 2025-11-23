import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Avatar,
    Stack,
    Alert,
    Grid,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Person as PersonIcon,
    AdminPanelSettings as AdminIcon,
    Business as BusinessIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CompanyOverview = () => {
    const { isAdmin } = useAuth();
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Edit State
    const [openEdit, setOpenEdit] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        address: '',
        country: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, companyRes] = await Promise.all([
                axios.get(`${API_URL}/api/users`, { withCredentials: true }),
                axios.get(`${API_URL}/api/company`, { withCredentials: true })
            ]);
            setUsers(usersRes.data);
            setCompany(companyRes.data);
            setEditForm({
                name: companyRes.data.name,
                address: companyRes.data.address || '',
                country: companyRes.data.country || ''
            });
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load company data.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = () => {
        setEditForm({
            name: company.name,
            address: company.address || '',
            country: company.country || ''
        });
        setOpenEdit(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await axios.put(
                `${API_URL}/api/company`,
                editForm,
                { withCredentials: true }
            );
            setCompany(response.data);
            setOpenEdit(false);
        } catch (err) {
            console.error('Error updating company:', err);
            setError('Failed to update company details.');
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin()) {
        return <Alert severity="error">Access Denied</Alert>;
    }

    return (
        <Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Company Details Card */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Typography variant="h6" gutterBottom>
                                    {t('companyOverview.companyName')}
                                </Typography>
                                <Button
                                    startIcon={<EditIcon />}
                                    size="small"
                                    onClick={handleEditClick}
                                >
                                    {t('common.edit')}
                                </Button>
                            </Stack>

                            {loading ? (
                                <Typography>{t('common.loading')}</Typography>
                            ) : company ? (
                                <Box mt={2}>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">{t('companyOverview.companyName')}</Typography>
                                            <Typography variant="body1" fontWeight="medium">{company.name}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Address</Typography>
                                            <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                                                {company.address || 'No address set'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">{t('companyOverview.country')}</Typography>
                                            <Typography variant="body1">
                                                {company.country || 'Not set'}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Box>
                            ) : (
                                <Typography color="error">Could not load details</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Team Members Card */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {t('companyOverview.employees')}
                            </Typography>

                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('companyOverview.employee')}</TableCell>
                                            <TableCell>{t('invites.email')}</TableCell>
                                            <TableCell>{t('invites.role')}</TableCell>
                                            <TableCell>{t('companyOverview.targetHours')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center">Loading...</TableCell>
                                            </TableRow>
                                        ) : users.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center">No users found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            users.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={2} alignItems="center">
                                                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                                                {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                                                            </Avatar>
                                                            <Typography variant="body2">
                                                                {user.firstName} {user.lastName}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            icon={user.role === 'ADMIN' ? <AdminIcon /> : <PersonIcon />}
                                                            label={user.role}
                                                            size="small"
                                                            color={user.role === 'ADMIN' ? 'primary' : 'default'}
                                                            variant={user.role === 'ADMIN' ? 'filled' : 'outlined'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{user.weeklyHoursTarget}h</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Edit Dialog */}
            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('companyOverview.editDialogTitle')}</DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ mt: 1 }}>
                        <TextField
                            label={t('companyOverview.companyName')}
                            fullWidth
                            margin="normal"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            required
                        />
                        <TextField
                            label={t('companyOverview.address')}
                            fullWidth
                            margin="normal"
                            multiline
                            rows={3}
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        />
                        <TextField
                            label={t('companyOverview.country')}
                            fullWidth
                            margin="normal"
                            value={editForm.country}
                            onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                            helperText={t('companyOverview.countryHelperText')}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEdit(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handleSave} variant="contained" disabled={saving}>
                        {saving ? t('common.saving') : t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CompanyOverview;
