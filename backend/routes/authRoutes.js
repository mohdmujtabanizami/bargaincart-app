const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// REGISTER API
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }
    const user = await User.create({ firstName, lastName, email, password });
    const token = user.getJwtToken();

    res.status(201).json({ success: true, message: "Account created!", token, user: { id: user._id, firstName: user.firstName, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// LOGIN API
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid Email or Password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid Email or Password" });

    const token = user.getJwtToken();
    res.status(200).json({ success: true, message: "Login Successful!", token, user: { id: user._id, firstName: user.firstName, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;