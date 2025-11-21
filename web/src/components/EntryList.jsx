import React, { useEffect, useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  Paper,
  Alert,
  Typography,
  IconButton,
  Box,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Edit as EditIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import EditEntryDialog from './EditEntryDialog';
import EditHistoryDialog from './EditHistoryDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EntryList = ({ refresh }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/entries/me`,
        { withCredentials: true }
      );
      // Fetch edit counts for each entry
      const entriesWithEditCount = await Promise.all(
        response.data.map(async (entry) => {
          try {
            const historyRes = await axios.get(
              `${API_URL}/api/entries/${entry.id}/history`,
              { withCredentials: true }
            );
            return { ...entry, editCount: historyRes.data.length };
          } catch {
            return { ...entry, editCount: 0 };
          }
        })
      );
      setEntries(entriesWithEditCount);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [refresh]);

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };

  const handleViewHistory = (entry) => {
    setSelectedEntry(entry);
    setHistoryDialogOpen(true);
  };

  const handleEditSuccess = () => {
    fetchEntries();
  };

  return (
    <>
      <Paper elevation={2} style={{ padding: '1em' }}>
        <Typography variant="h6" gutterBottom>
          Recent Entries
        </Typography>

        {entries.length <= 0 && (
          <Alert severity="info">No entries yet. Click Start to begin tracking!</Alert>
        )}

        <List>
          {entries.slice(0, 10).map((entry) => (
            <ListItem
              key={entry.id}
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {entry.editCount > 0 && (
                    <Tooltip title="View edit history">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleViewHistory(entry)}
                      >
                        <Badge badgeContent={entry.editCount} color="primary">
                          <HistoryIcon fontSize="small" />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Edit entry">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleEdit(entry)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {entry.type === "START" ? (
                      <ArrowUpwardIcon color="success" fontSize="small" />
                    ) : (
                      <ArrowDownwardIcon color="error" fontSize="small" />
                    )}
                    {entry.type === "START" ? "Started" : "Stopped"}
                  </Box>
                }
                secondary={
                  <>
                    {format(new Date(entry.time), 'HH:mm:ss yyyy-MM-dd', { locale: de })}
                    {entry.note && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Note: {entry.note}
                      </Typography>
                    )}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <EditEntryDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        entry={selectedEntry}
        onSuccess={handleEditSuccess}
      />

      <EditHistoryDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        entryId={selectedEntry?.id}
      />
    </>
  );
};

export default EntryList;