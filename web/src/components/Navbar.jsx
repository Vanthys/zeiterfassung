import React, { useState } from "react";
import { AppBar, Toolbar, Typography, Button, Box, Drawer, List, ListItem, ListItemText, Stack, ListItemIcon } from "@mui/material";
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import DatasetIcon from '@mui/icons-material/Dataset';
import { Link } from "react-router-dom";

const Navbar = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    return (
        <Box sx={{ flexGrow: 1}} position="sticky">

        <AppBar position="sticky" color="primary">
            <Stack direction="row" spacing={1}>
            <IconButton onClick={toggleDrawer}
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, alignSelf: "center" }}>
                Zeiterfassung
            </Typography>
            </Stack>
        
            <Drawer open={drawerOpen} onClose={toggleDrawer}>
                <List>
                    <ListItem component={Link} to="/" onClick={toggleDrawer} color="primary">
                        <ListItemIcon>
                            <HomeIcon/>
                        </ListItemIcon>
                        <ListItemText primary="Home" />
                    </ListItem>
                    <ListItem component={Link} to="/online" onClick={toggleDrawer}>
                        <ListItemIcon>
                            <AlternateEmailIcon/>
                        </ListItemIcon>
                        <ListItemText primary="Online" />
                    </ListItem>
                    <ListItem component={Link} to="/data" onClick={toggleDrawer}>
                    <ListItemIcon>
                            <DatasetIcon/>
                        </ListItemIcon>
                        <ListItemText primary="Data" />
                    </ListItem>
                </List>
            </Drawer>
            </AppBar>
        </Box>
    );
};

export default Navbar;
