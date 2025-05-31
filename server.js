require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Replaces bodyParser.json()
app.use(express.static(path.join(__dirname, "public")));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true } // Set secure: true if using HTTPS
}));

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch(err => console.error("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    lastLogin: Date,
    lastLogout: Date
});
const User = mongoose.model('User', userSchema);

// User Registration
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        console.log(`🟢 User Registered: ${username} (${email}) at ${new Date()}`);
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("❌ Registration error:", error);
        res.status(500).json({ message: "Registration failed", error });
    }
});

// User Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Update last login time
        user.lastLogin = new Date();
        await user.save();

        // Store user session
        req.session.user = { email: user.email, username: user.username };

        console.log(`🟢 User Logged In: ${user.username} (${user.email}) at ${user.lastLogin}`);

        // Redirect user to after_login.html
        res.status(200).json({ success: true, redirect: "after_login.html" });
    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ message: "Login failed", error });
    }
});

// User Logout
app.post('/logout', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(400).json({ message: "No active session" });
        }

        const { email } = req.session.user;

        // Update logout time
        const user = await User.findOneAndUpdate(
            { email },
            { lastLogout: new Date() },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Destroy session
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ message: "Logout failed", error: err });
            }

            console.log(`🔴 User Logged Out: ${user.username} (${user.email}) at ${user.lastLogout}`);
            
            // Redirect user to index.html
            res.status(200).json({ success: true, redirect: "index.html" });
        });
    } catch (error) {
        console.error("❌ Logout error:", error);
        res.status(500).json({ message: "Logout failed", error });
    }
});

// Route to Serve after_login.html (Ensures only logged-in users can access it)
app.get('/after_login', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/index.html'); // Redirect to index if not logged in
    }
    res.sendFile(path.join(__dirname, "public", "after_login.html"));
});
// Check if user is logged in
app.get('/check-session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, username: req.session.user.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Defect Schema
const defectSchema = new mongoose.Schema({
    tankName: String,
    model: String,
    year: Number,
    description: String,
    defectNo: Number,
    defectRefNo: Number,
    engineNo: String,
    tankBANo: String,
    engineHrs: String,
    km: String,
    lastMaintenance: Date,
    inSuitDIDate: Date,
    receiptHVF: Date,
    receiptCVRDE: Date,
    dateJRI: Date,
    detailedDI: Date,
    placeDI: String,
    backgroundCase: String,
    investigationReport: Date,
    natureDefect: String,
    causeFailure: String,
    remedialMeasure: String,
    conclusion: String,
    correctivePrevention: String,
    holdingEquipment: String,
    issueDate: Date,
    recStart: Date,
    recCom: Date,
    coupDate: Date,
    netMainDate: Date,
    ppDate: Date,
    backloadingDate: Date,
    partNo: String,
    sparesCon: Number,
    nom: String,
    quantity: Number,
    remark: String
});

// Model
const Defect = mongoose.model("Defect", defectSchema);

// Route to handle defect reporting
app.post("/report-defect", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        const newDefect = new Defect(req.body);
        await newDefect.save();

        console.log(`🔧 Defect Reported: ${req.body.tankName} - ${req.body.description}`);
        res.status(201).json({ message: "Defect reported successfully!" });
    } catch (error) {
        console.error("❌ Error saving defect:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Fetch all defects (for search and display)
app.get("/get-defects", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        const defects = await Defect.find();
        res.status(200).json(defects);
    } catch (error) {
        console.error("❌ Error fetching defects:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
