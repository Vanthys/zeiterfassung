import React, { useState } from "react";
import { AppBar, Typography, Box, Drawer, List, ListItem, ListItemText, Stack, ListItemIcon, Button, Divider } from "@mui/material";
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import DatasetIcon from '@mui/icons-material/Dataset';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <Box sx={{ flexGrow: 1 }} position="sticky">

            <AppBar position="sticky" color="primary">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1 }}>
                    <IconButton onClick={toggleDrawer}
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Zeiterfassung
                    </Typography>

                    {user && (
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                                <AccountCircleIcon />
                                <Typography variant="body1">
                                    {user.firstName || user.email}
                                    {isAdmin() && <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.8 }}>(Admin)</Typography>}
                                </Typography>
                            </Stack>
                            <Button
                                color="inherit"
                                startIcon={<LogoutIcon />}
                                onClick={handleLogout}
                            >
                                Logout
                            </Button>
                        </Stack>
                    )}
                </Stack>

                <Drawer open={drawerOpen} onClose={toggleDrawer}>
                    <List sx={{ minWidth: 250 }}>
                        <ListItem component={Link} to="/" onClick={toggleDrawer} color="primary">
                            <ListItemIcon>
                                <HomeIcon />
                            </ListItemIcon>
                            <ListItemText primary="Home" />
                        </ListItem>
                        <ListItem component={Link} to="/online" onClick={toggleDrawer}>
                            <ListItemIcon>
                                <AlternateEmailIcon />
                            </ListItemIcon>
                            <ListItemText primary="Online" />
                        </ListItem>
                        <ListItem component={Link} to="/data" onClick={toggleDrawer}>
                            <ListItemIcon>
                                <DatasetIcon />
                            </ListItemIcon>
                            <ListItemText primary="Data" />
                        </ListItem>
                        <ListItem component={Link} to="/weekly" onClick={toggleDrawer}>
                            <ListItemIcon>
                                <BarChartIcon />
                            </ListItemIcon>
                            <ListItemText primary="Weekly Stats" />
                        </ListItem>
                        <ListItem component={Link} to="/calendar" onClick={toggleDrawer}>
                            <ListItemIcon>
                                <CalendarMonthIcon />
                            </ListItemIcon>
                            <ListItemText primary="Calendar" />
                        </ListItem>

                        {isAdmin() && (
                            <>
                                <Divider sx={{ my: 1 }} />
                                <ListItem component={Link} to="/admin/users" onClick={toggleDrawer}>
                                    <ListItemIcon>
                                        <PeopleIcon />
                                    </ListItemIcon>
                                    <ListItemText primary="User Management" secondary="Admin Only" />
                                </ListItem>
                            </>
                        )}
                    </List>
                </Drawer>
            </AppBar>
        </Box>
    );
};

export default Navbar;

