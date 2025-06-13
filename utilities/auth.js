const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin.model');
const User = require('../models/user.model');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      isAdmin: user.isAdmin || false,
      isPremium: user.isPremium || false
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Hash a password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password with hashed password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Try to find user in User collection first
    let user = await User.findById(decoded.id);
    
    // If not found in User collection, try Admin collection
    if (!user) {
      const admin = await Admin.findById(decoded.id);
      if (admin) {
        user = admin;
      }
    }
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Attach user to request object
    req.user = {
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin || false,
      isPremium: user.isPremium || false
    };
    
    // Set userId for backward compatibility
    req.userId = user._id;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Attach admin to request object
    req.user = {
      id: admin._id,
      email: admin.email,
      isAdmin: true
    };
      req.userId = admin._id;

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  authMiddleware,
  requireAdmin
};
