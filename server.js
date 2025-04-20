const express = require('express');
const mongoose = require('mongoose');
const { mongoURL } = require('./environment');

const app = express();
const PORT = 3000;

// Replace with your actual MongoDB URL

// Connect to MongoDB
mongoose.connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define a User schema
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    age: Number,
});

// Define a User schema
const dashboardSchema = new mongoose.Schema({
    name: String,
    age: Number,
    status: String,
});

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


const User = mongoose.model('User', userSchema);
const Dashboard = mongoose.model('Dashboard', dashboardSchema);

// Define a route to get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find(); // Fetch all users
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching users', error: err });
    }
});

// POST: Create new user
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, age } = req.body;
        const newUser = new User({ name, email, age });
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (err) {
        res.status(400).json({ message: 'Error creating user', error: err });
    }
});


// PUT: Update user by ID
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        const updatedUser = await User.findByIdAndUpdate(id, updatedData, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ message: 'Error updating user', error: err });
    }
});

// DELETE: Remove user by ID
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: 'Error deleting user', error: err });
    }
});

// Define a route to get all users
app.get('/api/dashboard', async (req, res) => {
    try {
        const dashboard = await Dashboard.find(); // Fetch all users
        res.json(dashboard);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching users', error: err });
    }
});

// POST: Create new user
app.post('/api/dashboard', async (req, res) => {
    try {
        const { name, age, status } = req.body;
        const newUser = new Dashboard({ name, age, status });
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (err) {
        res.status(400).json({ message: 'Error creating user', error: err });
    }
});

// PUT: Update a dashboard user by ID
app.put('/api/dashboard/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedUser = await Dashboard.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser);
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(400).json({ message: 'Error updating user', error: err });
    }
});


// DELETE: Remove a dashboard user by ID
app.delete('/api/dashboard/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deletedUser = await Dashboard.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(400).json({ message: 'Error deleting user', error: err });
    }
});


// GET: Count users by status
app.get('/api/dashboard/status-counts', async (req, res) => {

    try {

        const counts = await Dashboard.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format response as an object: { active: 10, inactive: 5, suspended: 2 }
        const formattedCounts = counts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        res.json(formattedCounts);
    } catch (err) {
        console.error("Error getting status counts:", err);
        res.status(500).json({ message: "Error fetching status counts", error: err });
    }
});




// Store SSE clients
let clients = [];

// SSE endpoint
app.get('/api/dashboard/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.flushHeaders();
    clients.push(res);

    console.log('Client connected. Total clients:', clients.length);

    // Remove client on disconnect
    req.on('close', () => {
        clients = clients.filter(client => client !== res);
        console.log('Client disconnected. Total clients:', clients.length);
    });
});


// Watch MongoDB for changes and send real-time updates
Dashboard.watch().on('change', async () => {
    try {
        const counts = await Dashboard.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const formattedCounts = counts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        // Send to all SSE clients
        clients.forEach(res => {
            res.send(`data: ${JSON.stringify(formattedCounts)}\n\n`);
        });

        console.log('Sent update to clients:', formattedCounts);
    } catch (err) {
        console.error('Error sending dashboard update:', err);
    }
});








app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
