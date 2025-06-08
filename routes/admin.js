const express = require('express');
const router = express.Router();
const Admin = require('../models/admin.model');
const User = require('../models/user.model');
const { generateToken, hashPassword, comparePassword, authMiddleware } = require('../utilities/auth');

// Admin Authentication Middleware
const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Call the regular auth middleware first to verify token
    authMiddleware(req, res, async () => {
      // Check if user is an admin
      const admin = await Admin.findById(req.userId);
      if (!admin) {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }
      // Admin found, proceed
      next();
    });
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

/**
 * @route POST /admin/register
 * @desc Register a new admin
 * @access Public (ideally should be restricted to super-admin)
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists with this email' });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create new admin
    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
    });

    // Save admin to database
    await admin.save();

    // Generate JWT token
    const token = generateToken(admin);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route POST /admin/login
 * @desc Login admin
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(admin);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /admin/dashboard
 * @desc Get admin dashboard data
 * @access Private (Admin only)
 */
router.get('/dashboard', adminAuthMiddleware, async (req, res) => {
  try {
    // Get total user count
    const totalUsers = await User.countDocuments();

    // Get users with active subscriptions
    const activeSubscriptions = await User.countDocuments({ 'subscription.isActive': true });

    // Get monthly revenue (subscriptions started in the current month)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all payments for the current month
    const subscriptionPayments = await User.aggregate([
      {
        $unwind: '$payments'
      },
      {
        $match: {
          'payments.createdAt': { $gte: firstDayOfMonth },
          'payments.status': 'captured'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$payments.amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate monthly revenue
    const monthlyRevenue = subscriptionPayments.length > 0 ? subscriptionPayments[0].totalRevenue : 0;
    const monthlyTransactions = subscriptionPayments.length > 0 ? subscriptionPayments[0].count : 0;

    // Get recent subscriptions (last 10)
    const recentSubscriptions = await User.find({ 'subscription.isActive': true })
      .select('name email subscription')
      .sort({ 'subscription.startDate': -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeSubscriptions,
        monthlyRevenue,
        monthlyTransactions,
        recentSubscriptions
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /admin/users
 * @desc Get all users with pagination
 * @access Private (Admin only)
 */
router.get('/users', adminAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('name email subscription createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total: totalUsers,
          page,
          pages: Math.ceil(totalUsers / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /admin/users/:id
 * @desc Get user details by ID
 * @access Private (Admin only)
 */
router.get('/users/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /admin/subscriptions
 * @desc Get subscription statistics
 * @access Private (Admin only)
 */
router.get('/subscriptions', adminAuthMiddleware, async (req, res) => {
  try {
    // Get monthly subscription trend for the past 6 months
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await User.aggregate([
      {
        $match: {
          'subscription.startDate': { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$subscription.startDate' },
            month: { $month: '$subscription.startDate' }
          },
          count: { $sum: 1 },
          revenue: { $sum: 199 } // Assuming fixed subscription price
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format the results
    const subscriptionTrend = monthlyTrend.map(item => ({
      month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
      subscriptions: item.count,
      revenue: item.revenue
    }));

    res.status(200).json({
      success: true,
      data: {
        subscriptionTrend,
        activeSubscriptions: await User.countDocuments({ 'subscription.isActive': true }),
        totalRevenue: subscriptionTrend.reduce((acc, item) => acc + item.revenue, 0)
      }
    });
  } catch (error) {
    console.error('Subscription statistics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
