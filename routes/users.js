const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { generateToken, hashPassword, comparePassword, authMiddleware } = require('../utilities/auth');
const { createOrder, verifyPaymentSignature, createCustomer, getSubscriptionPlan } = require('../utilities/razorpay');

/**
 * @route POST /users/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, deviceId } = req.body;

    // Validate input
    if (!name || !email || !password || !deviceId) {
      return res.status(400).json({ message: 'Please provide all required fields including device ID' });
    }

    // Check if device ID already registered
    const existingDeviceUser = await User.findOne({ registrationDeviceId: deviceId });
    if (existingDeviceUser) {
      return res.status(400).json({ message: 'This device is already registered to another account' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      registrationDeviceId: deviceId,
      devices: [{
        deviceId,
        lastLogin: Date.now()
      }]
    });

    // Save user to database
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        subscription: user.subscription,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route POST /users/login
 * @desc Login user
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    // Validate input
    if (!email || !password || !deviceId) {
      return res.status(400).json({ message: 'Please provide email, password and device ID' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update device login time
    const deviceIndex = user.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex >= 0) {
      user.devices[deviceIndex].lastLogin = Date.now();
    } else {
      user.devices.push({
        deviceId,
        lastLogin: Date.now()
      });
    }
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        subscription: user.subscription,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /users/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route POST /users/subscription/create
 * @desc Create subscription order
 * @access Private
 */
router.post('/subscription/create', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get subscription plan details
    const plan = getSubscriptionPlan();

    // Create a new customer in Razorpay if not already created
    if (!user.subscription.razorpayCustomerId) {
      const customer = await createCustomer(user.name, user.email);
      user.subscription.razorpayCustomerId = customer.id;
      await user.save();
    }

    // Create a new order for subscription payment
    const order = await createOrder(
      plan.amount,
      plan.currency,
      `subscription_${user._id}`
    );

    res.status(200).json({
      success: true,
      message: 'Subscription order created',
      data: {
        order,
        key_id: process.env.RAZORPAY_KEY_ID,
        user_info: {
          name: user.name,
          email: user.email,
          contact: req.body.contact || ''
        },
        subscription: {
          plan: plan.name,
          amount: plan.amount,
          currency: plan.currency,
          description: plan.description
        }
      }
    });
  } catch (error) {
    console.error('Subscription order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route POST /users/subscription/verify
 * @desc Verify subscription payment
 * @access Private
 */
router.post('/subscription/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify the payment signature
    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get subscription details
    const plan = getSubscriptionPlan();
    
    // Calculate subscription end date (1 month from now)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // Update user's subscription
    user.subscription.isActive = true;
    user.subscription.plan = 'monthly';
    user.subscription.startDate = startDate;
    user.subscription.endDate = endDate;

    // Add payment record
    user.payments.push({
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature,
      amount: plan.amount,
      status: 'captured'
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified. Subscription activated successfully',
      data: {
        subscription: user.subscription,
        payment: user.payments[user.payments.length - 1]
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /users/subscription
 * @desc Get subscription status
 * @access Private
 */
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if subscription has expired
    if (user.subscription.isActive && user.subscription.endDate < new Date()) {
      user.subscription.isActive = false;
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        subscription: user.subscription,
        payments: user.payments
      }
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
