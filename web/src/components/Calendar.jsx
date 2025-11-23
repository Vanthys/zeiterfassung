import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, endOfWeek } from 'date-fns';
import { de, enUS, fr, es, it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    useTheme,
    FormControlLabel,
    Checkbox,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
} from '@mui/material';
import { Delete as DeleteIcon, Phone as PhoneIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Locale map
const locales = {
    de,
    en: enUS,
    fr,
    es,
    it
};

const Calendar = () => {
    const { user } = useAuth();
    const theme = useTheme();
    const { t } = useTranslation();
    const [events, setEvents] = useState([]);
    const [view, setView] = useState(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [note, setNote] = useState('');
    const [isOnCall, setIsOnCall] = useState(false);

    // Admin multi-user view
    const [selectedUserId, setSelectedUserId] = useState('me');
    const [companyUsers, setCompanyUsers] = useState([]);

    const localeString = user?.company?.country || 'en-US';
    const lang = localeString.split('-')[0].toLowerCase();
    const locale = locales[lang] || locales.en;
    const isAdmin = user?.role === 'ADMIN';

    // Create localizer with date-fns
    const localizer = useMemo(() => {
        return dateFnsLocalizer({
            format: (date, formatStr, options) => format(date, formatStr, { ...options, locale }),
            parse,
            startOfWeek: (date) => startOfWeek(date, { locale, weekStartsOn: 1 }), // Monday
            getDay,
            locales: { [lang]: locale }
        });
    }, [lang, locale]);

    const { minTime, maxTime } = useMemo(() => {
        const min = new Date();
        min.setHours(8, 0, 0, 0);
        const max = new Date();
        max.setHours(20, 0, 0, 0);
        return { minTime: min, maxTime: max };
    }, []);

    // Fetch company users for admin
    useEffect(() => {
        if (isAdmin) {
            const fetchCompanyUsers = async () => {
                try {
                    const response = await axios.get(`${API_URL}/api/users`, {
                        withCredentials: true,
                    });
                    setCompanyUsers(response.data);
                } catch (error) {
                    console.error('Error fetching company users:', error);
                }
            };
            fetchCompanyUsers();
        }
    }, [isAdmin]);

    const fetchEvents = useCallback(async () => {
        try {
            let start, end;
            if (view === Views.WEEK) {
                const weekStart = startOfWeek(date, { locale, weekStartsOn: 1 });
                const weekEnd = endOfWeek(date, { locale, weekStartsOn: 1 });
                start = format(weekStart, 'yyyy-MM-dd');
                end = format(weekEnd, 'yyyy-MM-dd');
            } else {
                const monthStart = startOfMonth(date);
                const monthEnd = endOfMonth(date);
                start = format(monthStart, 'yyyy-MM-dd');
                end = format(monthEnd, 'yyyy-MM-dd');
            }

            const params = { start, end };
            if (isAdmin && selectedUserId !== 'me') {
                params.userId = selectedUserId;
            }

            const response = await axios.get(`${API_URL}/api/calendar`, {
                params,
                withCredentials: true,
            });

            const parsedEvents = response.data.map(evt => ({
                ...evt,
                start: new Date(evt.start),
                end: new Date(evt.end),
            }));

            setEvents(parsedEvents);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
        }
    }, [date, view, locale, isAdmin, selectedUserId]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleSelectSlot = (slotInfo) => {
        setSelectedSlot(slotInfo);
        setSelectedEvent(null);
        setNote('');
        setIsOnCall(false);
        setOpenDialog(true);
    };

    const handleSelectEvent = (event) => {
        if (event.type === 'planned') {
            setSelectedEvent(event);
            setSelectedSlot(null);
            setNote(event.title === 'Planned Work' ? '' : event.title);
            setIsOnCall(event.isOnCall || false);
            setOpenDialog(true);
        }
    };

    const handleSave = async () => {
        try {
            if (selectedEvent) {
                await axios.put(`${API_URL}/api/calendar/plan/${selectedEvent.dbId}`, {
                    start: selectedEvent.start,
                    end: selectedEvent.end,
                    note: note || 'Planned Work',
                    isOnCall,
                }, { withCredentials: true });
            } else if (selectedSlot) {
                await axios.post(`${API_URL}/api/calendar/plan`, {
                    start: selectedSlot.start,
                    end: selectedSlot.end,
                    note: note || 'Planned Work',
                    isOnCall,
                }, { withCredentials: true });
            }
            setOpenDialog(false);
            fetchEvents();
        } catch (error) {
            console.error('Error saving plan:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedEvent) return;
        try {
            await axios.delete(`${API_URL}/api/calendar/plan/${selectedEvent.dbId}`, {
                withCredentials: true
            });
            setOpenDialog(false);
            fetchEvents();
        } catch (error) {
            console.error('Error deleting plan:', error);
        }
    };

    const eventStyleGetter = (event) => {
        let backgroundColor = theme.palette.primary.main;
        let borderLeft = '0px';

        if (event.type === 'worked') {
            backgroundColor = theme.palette.success.main;
            if (event.status === 'ONGOING') backgroundColor = theme.palette.success.light;
            if (event.status === 'PAUSED') backgroundColor = theme.palette.warning.main;
        } else if (event.type === 'planned') {
            if (event.isOnCall) {
                backgroundColor = theme.palette.warning.main; // Orange for on-call
                borderLeft = `4px solid ${theme.palette.warning.dark}`;
            } else {
                backgroundColor = theme.palette.info.main;
            }
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                borderLeft,
                display: 'block'
            }
        };
    };

    const EventComponent = ({ event }) => {
        return (
            <Box>
                <Typography variant="caption" component="div" sx={{ fontWeight: 'bold' }}>
                    {event.isOnCall && <PhoneIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />}
                    {event.title}
                </Typography>
                {event.userName && (
                    <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem', opacity: 0.9 }}>
                        {event.userName}
                    </Typography>
                )}
            </Box>
        );
    };

    const messages = useMemo(() => {
        if (lang === 'de') {
            return {
                date: 'Datum',
                time: 'Zeit',
                event: 'Ereignis',
                allDay: 'Ganztägig',
                week: 'Woche',
                work_week: 'Arbeitswoche',
                day: 'Tag',
                month: 'Monat',
                previous: 'Zurück',
                next: 'Weiter',
                yesterday: 'Gestern',
                tomorrow: 'Morgen',
                today: 'Heute',
                agenda: 'Agenda',
                noEventsInRange: 'Keine Ereignisse in diesem Zeitraum.',
                showMore: total => `+ ${total} mehr`
            };
        }
        return undefined;
    }, [lang]);

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', p: 2 }}>
            <Card sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Admin User Filter */}
                    {isAdmin && (
                        <Box sx={{ mb: 2 }}>
                            <FormControl size="small" sx={{ minWidth: 250 }}>
                                <InputLabel>{t('calendar.viewCalendar')}</InputLabel>
                                <Select
                                    value={selectedUserId}
                                    label={t('calendar.viewCalendar')}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                >
                                    <MenuItem value="me">{t('calendar.myCalendar')}</MenuItem>
                                    <MenuItem value="all">{t('calendar.allTeam')}</MenuItem>
                                    {companyUsers.map(u => (
                                        <MenuItem key={u.id} value={u.id.toString()}>
                                            {u.firstName} {u.lastName}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}

                    <Box sx={{ flexGrow: 1 }}>
                        <BigCalendar
                            key={`${lang}-${selectedUserId}`}
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            views={[Views.WEEK, Views.DAY]}
                            defaultView={Views.WEEK}
                            view={view}
                            onView={setView}
                            date={date}
                            onNavigate={setDate}
                            selectable
                            onSelectSlot={handleSelectSlot}
                            onSelectEvent={handleSelectEvent}
                            eventPropGetter={eventStyleGetter}
                            components={{
                                event: EventComponent
                            }}
                            step={30}
                            timeslots={2}
                            min={minTime}
                            max={maxTime}
                            culture={lang}
                            messages={messages}
                        />
                    </Box>
                </CardContent>
            </Card>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>
                    {selectedEvent ? t('calendar.editSession') : t('calendar.planSession')}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, minWidth: 300 }}>
                        <TextField
                            autoFocus
                            margin="dense"
                            label={t('calendar.note')}
                            fullWidth
                            variant="outlined"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t('calendar.notePlaceholder')}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={isOnCall}
                                    onChange={(e) => setIsOnCall(e.target.checked)}
                                    color="warning"
                                />
                            }
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PhoneIcon fontSize="small" />
                                    <span>{t('calendar.onCall')}</span>
                                </Box>
                            }
                            sx={{ mt: 2 }}
                        />

                        {selectedSlot && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                                {format(selectedSlot.start, 'p', { locale })} - {format(selectedSlot.end, 'p', { locale })}
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    {selectedEvent && (
                        <Button onClick={handleDelete} color="error" startIcon={<DeleteIcon />}>
                            {t('calendar.delete')}
                        </Button>
                    )}
                    <Button onClick={() => setOpenDialog(false)}>{t('calendar.cancel')}</Button>
                    <Button onClick={handleSave} variant="contained">{t('calendar.save')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Calendar;

