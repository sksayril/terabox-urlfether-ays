const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    devices: [{
        deviceId: {
            type: String,
            required: true
        },
        lastLogin: {
            type: Date,
            default: Date.now
        }
    }],
    registrationDeviceId: {
        type: String,
        required: true
    },
    subscription: {
        isActive: {
            type: Boolean,
            default: false
        },
        plan: {
            type: String,
            default: 'free'
        },
        startDate: {
            type: Date
        },
        endDate: {
            type: Date
        },
        razorpayCustomerId: {
            type: String
        }
    },
    payments: [{
        razorpayPaymentId: {
            type: String
        },
        razorpayOrderId: {
            type: String
        },
        razorpaySignature: {
            type: String
        },
        amount: {
            type: Number
        },
        status: {
            type: String,
            enum: ['created', 'authorized', 'captured', 'refunded', 'failed'],
            default: 'created'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);