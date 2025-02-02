import React, { useEffect, useState } from "react";
import Cookies from 'universal-cookie';
import {
    Button,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import axios from "axios";
import EntryList from "./EntryList";

const API_URL = import.meta.env.VITE_API_URL;

const UserView = () => {
    const cookies = new Cookies();
    const [user, setUser] = useState(cookies.get('user_id') ?? "");

    const [users, setUsers] = useState([{id: cookies.get('user_id'), username: "loading..."}]);
    

    const [isStart, setIsStart] = useState(true)

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await axios.get(
                    API_URL + '/api/users'
                );
                setUsers([...response.data]);
            } catch (error) {
                console.error("Error getting users: ", error)
            }
        };
       
        loadUsers();
    }, []);

    useEffect(() => {
        const canStart = async () => {
            try {
                const response = await axios.get(API_URL + '/api/canstart/' + user)
                setIsStart(response.data.canStart)
            } catch (error) {
                console.error("Error getting can start: ", error)
            }
        }
        canStart();
    }, [user]);

    const handleChange = (e) => {
        cookies.set('user_id', e.target.value, { path: '/' });
        setUser(e.target.value);
        
    };

    const handleClick = async (e) => {
        e.preventDefault();
        const newEntry = {
            time: (new Date()).toISOString(),
            type: isStart ? "START" : "STOP"
        };

        try {
            await axios.post(
                API_URL + '/api/entries/' + user,
                newEntry
            );
        } catch (error) {
            console.error("Error creating entry:", error);
        }
        setIsStart(!isStart);
    };

    return (
        <Stack spacing={2}>
            <FormControl fullWidth>
                <InputLabel id="slabel">User</InputLabel>
                <Select
                    labelId="slabel"
                    id="select"
                    label="User"
                    value={user}
                    onChange={handleChange}
                >
                    {users.map( (user) => {
                        return (<MenuItem value={user.id} key={user.id}>{user.username}</MenuItem>)   
                    })}
                </Select>
            </FormControl>
            <Stack direction="row" spacing={2} sx={{justifyContent: "center", alignItems: "center"}}>
                <Button size="large" variant="contained" disabled={!isStart || user==""} onClick={handleClick}>Start</Button>
                <Button size="large" variant="contained" disabled={isStart || user==""} onClick={handleClick}>Stopp</Button>
            </Stack>
            <EntryList user_id={user} users={users} refresh={isStart}/>
        </Stack>
    );
};

export default UserView;
