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
    Button,
    TextField,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    FilterList as FilterIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AuditLog = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const locale = user?.company?.country || 'en-US';

    const [auditLog, setAuditLog] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        fetchUsers();
        fetchAuditLog();
    }, []);

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

    const fetchAuditLog = async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (selectedUserId) params.userId = selectedUserId;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await axios.get(`${API_URL}/api/stats/audit-log`, {
                params,
                withCredentials: true
            });
            setAuditLog(response.data);
        } catch (err) {
            console.error('Error fetching audit log:', err);
            setError(err.response?.data?.error || 'Failed to load audit log');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterApply = () => {
        fetchAuditLog();
    };

    const handleFilterClear = () => {
        setSelectedUserId('');
        setStartDate('');
        setEndDate('');
        // Fetch without filters
        setTimeout(() => fetchAuditLog(), 0);
    };

    const toggleRow = (editId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(editId)) {
            newExpanded.delete(editId);
        } else {
            newExpanded.add(editId);
        }
        setExpandedRows(newExpanded);
    };

    const formatDateTime = (date) => {
        return new Date(date).toLocaleString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getUserName = (userObj) => {
        if (!userObj) return 'Unknown';
        if (userObj.firstName && userObj.lastName) {
            return `${userObj.firstName} ${userObj.lastName}`;
        }
        return userObj.email;
    };

    const renderChangeValue = (value) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (value instanceof Date || !isNaN(Date.parse(value))) {
            return formatDateTime(value);
        }
        return String(value);
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                {t('auditLog.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                {t('auditLog.description')}
            </Typography>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel>{t('auditLog.filterByUser')}</InputLabel>
                            <Select
                                value={selectedUserId}
                                label={t('auditLog.filterByUser')}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                            >
                                <MenuItem value="">{t('auditLog.allUsers')}</MenuItem>
                                {users.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>
                                        {getUserName(u)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label={t('auditLog.startDate')}
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 150 }}
                        />

                        <TextField
                            label={t('auditLog.endDate')}
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 150 }}
                        />

                        <Button
                            variant="contained"
                            startIcon={<FilterIcon />}
                            onClick={handleFilterApply}
                            disabled={loading}
                        >
                            {t('auditLog.applyFilters')}
                        </Button>

                        <Button
                            variant="outlined"
                            onClick={handleFilterClear}
                            disabled={loading}
                        >
                            {t('auditLog.clearFilters')}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Audit Log Table */}
            <Card>
                <CardContent>
                    {loading ? (
                        <Typography>{t('common.loading')}</Typography>
                    ) : auditLog.length === 0 ? (
                        <Typography color="text.secondary">
                            {t('auditLog.noEdits')}
                        </Typography>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell width="50px"></TableCell>
                                        <TableCell>{t('auditLog.editDate')}</TableCell>
                                        <TableCell>{t('auditLog.editor')}</TableCell>
                                        <TableCell>{t('auditLog.employee')}</TableCell>
                                        <TableCell>{t('auditLog.sessionDate')}</TableCell>
                                        <TableCell>{t('auditLog.reason')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {auditLog.map((edit) => (
                                        <React.Fragment key={edit.id}>
                                            <TableRow hover>
                                                <TableCell>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => toggleRow(edit.id)}
                                                    >
                                                        {expandedRows.has(edit.id) ? (
                                                            <ExpandLessIcon />
                                                        ) : (
                                                            <ExpandMoreIcon />
                                                        )}
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell>{formatDateTime(edit.editedAt)}</TableCell>
                                                <TableCell>{getUserName(edit.editor)}</TableCell>
                                                <TableCell>{getUserName(edit.workSession?.user)}</TableCell>
                                                <TableCell>
                                                    {edit.workSession?.startTime
                                                        ? formatDate(edit.workSession.startTime)
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {edit.reason || (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {t('auditLog.noReason')}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell colSpan={6} sx={{ py: 0, px: 0 }}>
                                                    <Collapse
                                                        in={expandedRows.has(edit.id)}
                                                        timeout="auto"
                                                        unmountOnExit
                                                    >
                                                        <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                                                            <Typography variant="subtitle2" gutterBottom>
                                                                {t('auditLog.changes')}:
                                                            </Typography>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell><strong>{t('auditLog.field')}</strong></TableCell>
                                                                        <TableCell><strong>{t('auditLog.before')}</strong></TableCell>
                                                                        <TableCell><strong>{t('auditLog.after')}</strong></TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {edit.changes && Object.entries(edit.changes).map(([field, change]) => (
                                                                        <TableRow key={field}>
                                                                            <TableCell>{field}</TableCell>
                                                                            <TableCell>
                                                                                <Chip
                                                                                    label={renderChangeValue(change.old)}
                                                                                    size="small"
                                                                                    color="error"
                                                                                    variant="outlined"
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Chip
                                                                                    label={renderChangeValue(change.new)}
                                                                                    size="small"
                                                                                    color="success"
                                                                                    variant="outlined"
                                                                                />
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default AuditLog;
