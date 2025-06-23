const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Stream = require('stream');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(express.json());

const allowedOrigins = [
  'https://portfolio-admin-vaibhav.vercel.app',
  'https://vaibhavdev.vercel.app',
  'http://127.0.0.1:5173',
];

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, allowedOrigins.includes(origin) || !origin);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));

// Constants
const saltRounds = 10;
const secretKey = 'Vaibhav';

// MongoDB connection
const mongoURI = 'mongodb+srv://vaibhavmeshram2908:vaibhav123@cluster0.1pkf5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Error connecting to MongoDB:", err));

// Cloudinary config
cloudinary.config({
  cloud_name: 'dtj9srbsk',
  api_key: '335927119333625',
  api_secret: 'DQ9cWsodcxUyHKvM2jtCD_WbFx8',
});

// Models
const User = require('./Models/Register');
const Project = require('./Models/Project');
const Visit = require('./Models/Visit');
const Portfolio = require('./Models/Portfolio'); // <-- Add this model

// Multer (for Cloudinary uploads)
const upload = multer({ storage: multer.memoryStorage() });

// VISIT TRACKING
app.post('/track-visit', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await Visit.create({ ip });
    res.status(200).json({ message: "Visit logged" });
  } catch (err) {
    console.error('Error logging visit:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/visit-stats', async (req, res) => {
  try {
    const stats = await Visit.aggregate([
      {
        $group: {
          _id: { year: { $year: "$visitedAt" }, month: { $month: "$visitedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    res.status(200).json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// AUTH
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!password) return res.status(400).json({ message: 'Password is required' });

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = new User({ name, email, password: hashedPassword });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: "Invalid Password" });

    const token = jwt.sign({ userId: user._id, email: user.email }, secretKey, { expiresIn: '1h' });
    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PROJECT ROUTES
app.post('/add-project', upload.single('image'), async (req, res) => {
  const { name, description, link } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ message: "Image File is Mandatory" });

  try {
    const bufferStream = new Stream.PassThrough();
    bufferStream.end(file.buffer);

    const imageUrl = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({ folder: 'Project Images' }, (err, result) => {
        if (err) reject(new Error('Failed to upload image to Cloudinary'));
        else resolve(result.secure_url);
      });
      bufferStream.pipe(uploadStream);
    });

    const newProject = new Project({ name, description, link, image: imageUrl });
    await newProject.save();

    res.status(200).json({
      message: "Project Added Successfully",
      project: { name, description, link, image: imageUrl }
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

app.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).json(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

app.delete('/delete-project/:id', async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PORTFOLIO ROUTES
app.get('/portfolio', async (req, res) => {
  try {
    const data = await Portfolio.findOne();
    res.json(data || {});
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/portfolio', async (req, res) => {
  try {
    const exists = await Portfolio.findOne();
    if (exists) return res.status(400).json({ message: "Portfolio already exists. Use PUT to update." });

    const newPortfolio = new Portfolio(req.body);
    await newPortfolio.save();
    res.status(201).json(newPortfolio);
  } catch (err) {
    console.error('Error creating portfolio:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/portfolio', async (req, res) => {
  try {
    const updated = await Portfolio.findOneAndUpdate({}, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "No portfolio found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error('Error updating portfolio:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// SERVER
const PORT = 3001;
app.listen(PORT, () => console.log(`Server running at Port: ${PORT}`));
