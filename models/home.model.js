const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    path: {
        type: String,
        required: true
    },
    url: {
        type: String,
        default: 'https://'
    }
});

const homeSchema = new mongoose.Schema({
    thumbnailUrl: {
        type: imageSchema,
        default: () => ({})
    },
    searchableUrl: {
        type: String,
        default: ''
    },
    premiumBannerUrls: {
        type: [imageSchema],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    strict: false
});

module.exports = mongoose.model('Home', homeSchema);
