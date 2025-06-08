const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay with API keys from environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a new order for subscription payment
const createOrder = async (amount, currency = 'INR', receipt) => {
  try {
    const options = {
      amount: amount * 100, // Razorpay accepts amount in paise
      currency,
      receipt: receipt,
      payment_capture: 1 // Auto-capture payment
    };
    
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    throw new Error(`Razorpay order creation failed: ${error.message}`);
  }
};

// Verify payment signature
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    
    return generatedSignature === signature;
  } catch (error) {
    throw new Error(`Payment verification failed: ${error.message}`);
  }
};

// Create a customer in Razorpay
const createCustomer = async (name, email) => {
  try {
    const customer = await razorpay.customers.create({
      name,
      email
    });
    return customer;
  } catch (error) {
    throw new Error(`Customer creation failed: ${error.message}`);
  }
};

// Get subscription plan details 
const getSubscriptionPlan = () => {
  // Monthly plan for Rs. 199
  return {
    name: 'Monthly Subscription',
    amount: 199,
    currency: 'INR',
    interval: 'monthly',
    description: 'Monthly subscription plan for Rs. 199'
  };
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  createCustomer,
  getSubscriptionPlan
};
