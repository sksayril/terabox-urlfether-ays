const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    isMainCategory: {
        type: Boolean,
        default: false
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    title: {
        type: String,
        required: function() {
            return !this.isMainCategory; // Title is required only for subcategories
        },
        trim: true
    },
    imageUrl: {
        type: String,
        required: function() {
            return !this.isMainCategory; // Image is required only for subcategories
        }
    },
    telegramUrl: {
        type: String,
        required: function() {
            return !this.isMainCategory; // Telegram URL is required only for subcategories
        }
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
categorySchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parentCategory'
});

// Ensure virtuals are included in JSON output
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 