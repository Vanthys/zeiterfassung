require("dotenv").config();
const path = require("path");
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const sessionRoutes = require('./routes/sessions');
const timeEntryRoutes = require('./routes/timeEntries');
const planningRoutes = require('./routes/planning');
const statsRoutes = require('./routes/stats');

const app = express();
const port = process.env.PORT || 5000;
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(bodyParser.json());
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/entries', timeEntryRoutes); // Legacy - will be deprecated
app.use('/api/planning', planningRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get("/api/alive", (req, res) => {
  res.json({ message: "Am alive" });
});

// Serve static files from React app
app.use(express.static(path.join(__dirname, "../web/dist")));

// Catch-all handler for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/dist/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[INFO]: Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[INFO]: Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`[INFO]: Server running on port ${port}`);
  console.log(`[INFO]: Using Prisma with SQLite database`);
});