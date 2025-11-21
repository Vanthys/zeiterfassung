import React, { useEffect, useState } from 'react';
import { List, ListItem, ListItemText, Paper, Alert, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import axios from 'axios';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EntryList = ({ refresh }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/entries/me`,
        { withCredentials: true }
      );
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [refresh]);

  return (
    <Paper elevation={2} style={{ padding: '1em' }}>
      <Typography variant="h6" gutterBottom>
        Recent Entries
      </Typography>

      {entries.length <= 0 && (
        <Alert severity="info">No entries yet. Click Start to begin tracking!</Alert>
      )}

      <List>
        {entries.slice(0, 10).map((entry) => (
          <ListItem key={entry.id}>
            <ListItemText
              primary={
                <>
                  {entry.type === "START" ? <ArrowUpwardIcon color="success" /> : <ArrowDownwardIcon color="error" />}
                  {entry.type === "START" ? "Started" : "Stopped"}
                </>
              }
              secondary={
                `${format(new Date(entry.time), 'HH:mm:ss yyyy-MM-dd', { locale: de })}`
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default EntryList;