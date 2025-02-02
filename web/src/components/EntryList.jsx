import React, { useEffect, useState } from 'react';
import { List, ListItem, ListItemText, Paper, Alert } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';


import axios from 'axios';
import { format, formatDuration, intervalToDuration } from 'date-fns';
import { de } from 'date-fns/locale'

const EntryList = ({user_id, users, refresh}) => {
  const [entries, setEntries] = useState([]);

  const fetchEntries = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/entries/' + user_id);
      //split into year, month
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  useEffect(() => {
    if (user_id != "")
        fetchEntries();
  }, [user_id, refresh]);

  
  
  return (
    <Paper elevation={2} style={{ padding: '1em', marginTop:'2em' }}>
        {entries.length <= 0 &&
         (
            user_id != "" ? 
                <Alert severity="warning">Keine Einträge für Nutzer</Alert> /* <Typography variant="subtitle1">Kein Nutzerausgew</Typography> */
                :
                <Alert severity="warning">Kein Nutzer ausgewählt</Alert> /* <Typography variant="subtitle1">Kein Nutzerausgew</Typography> */

         )
        }
      <List>
        {entries.map((entry) => (
          <ListItem 
            
            key={entry.id}/* 
            secondaryAction={
              <IconButton edge="end" onClick={() => handleDelete(entry.id)}>
                <Delete />
              </IconButton>
            } */
          >
            <ListItemText
              primary={
                <>
                
                 {entry.type == "START" ? <ArrowUpwardIcon/> : <ArrowDownwardIcon/>}
                 {users.find((u) => u.id == user_id).username}
                 </>
                }
              secondary={
              `${format(new Date(entry.time), 'HH:mm:ss yyyy-MM-dd', {locale: de})}`
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default EntryList;