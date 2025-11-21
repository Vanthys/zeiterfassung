import React, { useEffect, useState } from "react";
import {
    Button,
    Stack,
    Typography,
    Paper,
    Box,
} from "@mui/material";
import axios from "axios";
import EntryList from "./EntryList";
import { useAuth } from "../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const UserView = () => {
    const { user } = useAuth();
    const [isStart, setIsStart] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const canStart = async () => {
            try {
                const response = await axios.get(
                    `${API_URL}/api/entries/canstart`,
                    { withCredentials: true }
                );
                setIsStart(response.data.canStart);
            } catch (error) {
                console.error("Error getting can start: ", error);
            }
        };
        canStart();
    }, []);

    const handleClick = async (e) => {
        e.preventDefault();
        setLoading(true);

        const newEntry = {
            time: (new Date()).toISOString(),
            type: isStart ? "START" : "STOP"
        };

        try {
            await axios.post(
                `${API_URL}/api/entries`,
                newEntry,
                { withCredentials: true }
            );
            setIsStart(!isStart);
        } catch (error) {
            console.error("Error creating entry:", error);
            alert(error.response?.data?.error || "Failed to create entry");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack spacing={3}>
            <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                    Welcome, {user?.firstName || user?.username}!
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Track your work hours by clicking Start when you begin and Stop when you finish.
                </Typography>

                <Box mt={3}>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
                        <Button
                            size="large"
                            variant="contained"
                            color="success"
                            disabled={!isStart || loading}
                            onClick={handleClick}
                        >
                            {loading && !isStart ? 'Starting...' : 'Start'}
                        </Button>
                        <Button
                            size="large"
                            variant="contained"
                            color="error"
                            disabled={isStart || loading}
                            onClick={handleClick}
                        >
                            {loading && isStart ? 'Stopping...' : 'Stop'}
                        </Button>
                    </Stack>
                </Box>
            </Paper>

            <EntryList refresh={!isStart} />
        </Stack>
    );
};

export default UserView;

