import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { i18n } = useTranslation();

    // Check if user is logged in on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Update language when user changes
    useEffect(() => {
        if (user?.company?.country) {
            const lang = user.company.country.split('-')[0].toLowerCase();
            i18n.changeLanguage(lang);
        }
    }, [user, i18n]);

    const checkAuth = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/auth/me`, {
                withCredentials: true,
            });
            setUser(response.data.user);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/auth/login`,
                { email, password },
                { withCredentials: true }
            );
            setUser(response.data.user);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed',
            };
        }
    };

    const register = async (email, password, firstName, lastName, token) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/auth/register`,
                {
                    email,
                    password,
                    firstName,
                    lastName,
                    token
                },
                { withCredentials: true }
            );
            setUser(response.data.user);
            return { success: true };
        } catch (error) {
            throw error; // Let component handle error
        }
    };

    const logout = async () => {
        try {
            await axios.post(
                `${API_URL}/api/auth/logout`,
                {},
                { withCredentials: true }
            );
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
        }
    };

    const isAdmin = () => {
        return user?.role === 'ADMIN';
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isAdmin,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
