const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Stream = require('stream');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware
app.use(express.json());
app.use(cors());

const saltRounds = 10;
const secretKey = 'Vaibhav';

// MongoDB connection (replace with your own credentials)
const mongoURI = 'mongodb+srv://vaibhavmeshram2908:vaibhav123@cluster0.1pkf5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
}).then(() => {
    console.log("Mongodb Connected");
}).catch(error => {
    console.error("Error connecting to MongoDB:", error);
});

// Cloudinary configuration
cloudinary.config({
    cloud_name: 'dtj9srbsk',
    api_key: '335927119333625',
    api_secret: 'DQ9cWsodcxUyHKvM2jtCD_WbFx8',
});

// Models
const User = require('./Models/Register');
const Project = require('./Models/Project');

// Multer setup for file uploads (Memory storage for direct buffer handling)
const upload = multer({ storage: multer.memoryStorage() });

// Routes

// Registration Route
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = new User({ name, email, password: hashedPassword });
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: "Invalid Password" });
        }
        const token = jwt.sign({ userId: user._id, email: user.email }, secretKey, { expiresIn: '1h' });
        return res.status(200).json({ message: "Login successful", token: token });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Add Project Route
app.post('/add-project', upload.single('image'), async (req, res) => {
    const { name, description, link } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: "Image File is Mandatory" });
    }

    try {
        const bufferStream = new Stream.PassThrough();
        bufferStream.end(file.buffer);

        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({ folder: 'Project Images' }, (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(new Error('Failed to upload image to Cloudinary'));
                } else {
                    resolve(result.secure_url);
                }
            });

            bufferStream.pipe(uploadStream);
        });

        const imageUrl = await uploadPromise;

        // Save project to MongoDB
        const newProject = new Project({ name, description, link, image: imageUrl });
        await newProject.save();

        res.status(200).json({
            message: "Project Added Successfully",
            project: { name, description, link, image: imageUrl }
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});
app.get('/projects', async (req, res) => {
    try {
        const projects = await Project.find();
        console.log("Projects fetched:", projects);
        res.status(200).json(projects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

app.delete('/delete-project/:id', async (req,res) => {
    try{
        const deletedProject = await Project.findByIdAndDelete(id);
        if (!deletedProject) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json({ message: 'Project deleted successfully' });
    } catch(error){
        console.log(error)
    }
})
// Server Start
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running at Port: ${PORT}`);
});
