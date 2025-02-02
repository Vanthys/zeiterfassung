import React, { useEffect, useState } from "react";
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Button,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Grid2,
    Container,
    TableContainer,
    Table,
    TableHead,
    TableCell,
    TableBody,
    TableRow,
    Alert
} from "@mui/material";
import axios from "axios";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { subYears, format, parseISO, isValid } from "date-fns";
import { amber } from "@mui/material/colors";

const DataView = () => {
    const [user, setUser] = useState("");
    const [users, setUsers] = useState([{ id: 0, username: "loading..." }]);
    const [sessions, setSessions] = useState([]);

    const [groupedSessions, setGroupedSessions] = useState({});

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await axios.get(
                    "http://localhost:5000/api/users"
                );
                setUsers([...response.data]);
            } catch (error) {
                console.error("Error getting users: ", error);
            }
        };

        loadUsers();
    }, []);

    useEffect(() => {
        const loadSessions = async () => {
            try {
                const response = await axios.get(
                    "http://localhost:5000/api/sessions/"  + user
                );
                setSessions([...response.data]);
            } catch (error) {
                console.error("Error getting session: ", error);
            }
        };

        loadSessions();
    }, [users]);

    useEffect(() => {
        const groupByYearAndMonth = (sessions) => {
            const grouped = {};

            sessions.forEach((entry) => {
                const startDate = parseISO(entry.start_time);
                if (!isValid(startDate)) {
                    console.error("Invalid start date:", entry.start_time);
                    return;
                }

                const year = startDate.getFullYear();
                const month = startDate.getMonth() + 1;
                const yearMonth = `${year}-${month < 10 ? "0" : ""}${month}`;

                if (!grouped[year]) {
                    grouped[year] = {};
                }
                if (!grouped[year][yearMonth]) {
                    grouped[year][yearMonth] = [];
                }

                grouped[year][yearMonth].push(entry);
            });

            return grouped;
        };

        setGroupedSessions(groupByYearAndMonth(sessions));
    }, [sessions]);

    const handleChange = (e) => {
        setUser(e.target.value);
    };

    const calculateTotalDuration = (entries) => {
        let totalDuration = 0;

        entries.forEach((entry) => {
            const startDate = parseISO(entry.start_time);
            const stopDate = parseISO(entry.stop_time);

            if (!isValid(startDate) || !isValid(stopDate)) {
                console.error("Invalid date(s) in entry:", entry);
                return; // Skip invalid entries
            }

            totalDuration += stopDate - startDate; // duration in milliseconds
        });

        return totalDuration / 1000 / 60 / 60; // return in hours
    };

    return (
        <Stack spacing={2} sx={{ alignItems: "center" }}>
            <FormControl fullWidth sx={{ maxWidth: "32.75em" }}>
                <InputLabel id="slabel">User</InputLabel>
                <Select
                    labelId="slabel"
                    id="select"
                    label="User"
                    value={user}
                    onChange={handleChange}
                >
                    {users.map((user) => {
                        return (
                            <MenuItem value={user.id} key={user.id}>
                                {user.username}
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>

            <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: "space-around" }}
            >
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                        label="von"
                        defaultValue={subYears(new Date(), 1)}
                    />
                </LocalizationProvider>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker label="bis" defaultValue={new Date()} />
                </LocalizationProvider>
            </Stack>
            

            <Container>
                {user == "" &&
                    <Alert severity="error" sx={{marginBottom: "1em"}}>Kein Nutzer ausgewählt - Daten aller Nutzer werden angezeigt</Alert>
                }
                {Object.keys(groupedSessions).sort((a, b) => b - a).map((year) => (
                    <Stack key={year} sx={{marginBottom: "1em"}}>
                        <Typography variant="h5" gutterBottom>
                            {year}
                        </Typography>
                        {Object.keys(groupedSessions[year]).map((month) => {
                            const sessionsForMonth = groupedSessions[year][month];
                            const totalDuration = calculateTotalDuration(
                                sessionsForMonth
                            );
                            
                            const monthName = format(
                                new Date(year, month.split("-")[1]-1, 1),
                                "MMMM"
                            );

                            return (
                                <Accordion key={month}>
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                    >
                                        <Typography>{monthName}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack>
                                        <TableContainer sx={{marginBottom: "1em"}}>
                                            <Table>
                                                <TableHead>
                                                    <TableRow>
                                                        {user == "" && (
                                                            <TableCell>
                                                                <Typography variant="overline">
                                                                Nutzer
                                                                </Typography>
                                                            </TableCell>
                                                        
                                                        )}
                                                        <TableCell>
                                                            <Typography variant="overline">
                                                            Datum
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="overline">
                                                            Start
                                                            </Typography>
                                                        </TableCell>
                                                        
                                                        <TableCell>
                                                            <Typography variant="overline">
                                                            Ende
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                {sessionsForMonth.map(
                                                            (entry, idx) => (
                                                                <TableRow key={idx}>
                                                                     {user == "" && (
                                                            <TableCell>
                                                               
                                                                {entry.username}
                                                                </TableCell>
                                                        
                                                        )}
                                                                    <TableCell>
                                                                    {format(
                                                                            new Date(
                                                                                entry.start_time
                                                                            ),
                                                                            "dd.MM.yyyy"
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                    {format(
                                                                            new Date(
                                                                                entry.start_time
                                                                            ),
                                                                            "HH:mm"
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                    {format(
                                                                            new Date(
                                                                                entry.stop_time
                                                                            ),
                                                                            "HH:mm"
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                     
                                                            )
                                                        )}
                                                </TableBody>
                                            </Table>
                                            
                                        </TableContainer>
                                        <Typography variant="caption">Summe: {totalDuration.toFixed(2)} h</Typography>        
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </Stack>
                ))}
            </Container>
        </Stack>
    );
};

export default DataView;
