const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  institution: String,
  degree: String,
  cgpa: String,
  startYear: String,
  endYear: String,
});

const experienceSchema = new mongoose.Schema({
  company: String,
  role: String,
  startDate: String,
  endDate: String,
  year: String,
  description: String,
});

const portfolioSchema = new mongoose.Schema({
  name: String,
  profileImage: String,
  bio: String,
  education: [educationSchema],
  experience: [experienceSchema],
});

module.exports = mongoose.model("Portfolio", portfolioSchema);
