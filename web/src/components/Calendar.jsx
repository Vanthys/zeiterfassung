import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
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
    IconButton,
    Stack,
    useTheme,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Calendar = () => {
    const { user } = useAuth();
    const theme = useTheme();
    const [events, setEvents] = useState([]);
    const [view, setView] = useState(Views.WEEK);
    const [date, setDate] = useState(new Date());

    // Dialog state
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [note, setNote] = useState('');

    const fetchEvents = useCallback(async () => {
        try {
            // Calculate start/end of current view
            let start, end;
            if (view === Views.WEEK) {
                start = moment(date).startOf('week').format('YYYY-MM-DD');
                end = moment(date).endOf('week').format('YYYY-MM-DD');
            } else {
                start = moment(date).startOf('month').format('YYYY-MM-DD');
                end = moment(date).endOf('month').format('YYYY-MM-DD');
            }

            const response = await axios.get(`${API_URL}/api/calendar`, {
                params: { start, end },
                withCredentials: true,
            });

            // Convert strings to Date objects
            const parsedEvents = response.data.map(evt => ({
                ...evt,
                start: new Date(evt.start),
                end: new Date(evt.end),
            }));

            setEvents(parsedEvents);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
        }
    }, [date, view]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleSelectSlot = (slotInfo) => {
        setSelectedSlot(slotInfo);
        setSelectedEvent(null);
        setNote('');
        setOpenDialog(true);
    };

    const handleSelectEvent = (event) => {
        if (event.type === 'planned') {
            setSelectedEvent(event);
            setSelectedSlot(null);
            setNote(event.title === 'Planned Work' ? '' : event.title);
            setOpenDialog(true);
        }
    };

    const handleSave = async () => {
        try {
            if (selectedEvent) {
                // Update existing
                await axios.put(`${API_URL}/api/calendar/plan/${selectedEvent.dbId}`, {
                    start: selectedEvent.start,
                    end: selectedEvent.end,
                    note: note || 'Planned Work',
                }, { withCredentials: true });
            } else if (selectedSlot) {
                // Create new
                await axios.post(`${API_URL}/api/calendar/plan`, {
                    start: selectedSlot.start,
                    end: selectedSlot.end,
                    note: note || 'Planned Work',
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
        if (event.type === 'worked') {
            backgroundColor = theme.palette.success.main;
            if (event.status === 'ONGOING') backgroundColor = theme.palette.success.light;
            if (event.status === 'PAUSED') backgroundColor = theme.palette.warning.main;
        } else {
            // Planned
            backgroundColor = theme.palette.info.main;
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', p: 2 }}>
            <Card sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h5" gutterBottom>
                        Calendar
                    </Typography>

                    <Box sx={{ flexGrow: 1 }}>
                        <BigCalendar
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
                            step={30}
                            timeslots={2}
                        />
                    </Box>
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>
                    {selectedEvent ? 'Edit Planned Session' : 'Plan Work Session'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, minWidth: 300 }}>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Note (optional)"
                            fullWidth
                            variant="outlined"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g., Deep Work, Meetings"
                        />
                        {selectedSlot && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                                {moment(selectedSlot.start).format('LT')} - {moment(selectedSlot.end).format('LT')}
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    {selectedEvent && (
                        <Button onClick={handleDelete} color="error" startIcon={<DeleteIcon />}>
                            Delete
                        </Button>
                    )}
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Calendar;
