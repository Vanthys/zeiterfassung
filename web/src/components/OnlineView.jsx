import { Paper, Stack, Typography } from "@mui/material";
import axios from "axios";
import { useState, useEffect } from "react";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { format } from "date-fns";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const OnlineView = () => {

    const [users, setUsers] = useState([{ id: 0, username: "loading..." }])

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await axios.get(
                    `${API_URL}/api/users/online`,
                    { withCredentials: true }
                );
                setUsers([...response.data]);
            } catch (error) {
                console.error("Error getting users: ", error)
            }
        };

        loadUsers();
    }, []);

    return (
        <Stack>
            {
                users.map((user) => {
                    const displayName = user.firstName || user.username;
                    return (
                        <Paper key={user.id} elevation={2} style={{ padding: '1em', marginTop: '1em' }}>
                            <Stack>
                                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                                    <Typography>{displayName}</Typography>
                                    {user.online ?
                                        <CheckCircleIcon color="success" />
                                        :
                                        <CancelIcon color="error" />
                                    }
                                </Stack>

                                {user.online ?
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>jetzt online seit {format(new Date(user.time), 'HH:mm')}</Typography>
                                    :
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>zuletzt online: {user.time == undefined ? "nie" : format(new Date(user.time), 'HH:mm')}</Typography>
                                }
                            </Stack>
                        </Paper>)
                })
            }


        </Stack>

    )


}

export default OnlineView