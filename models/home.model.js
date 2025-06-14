const mongoose = require('mongoose');

const homeSchema = new mongoose.Schema({
    thumbnailUrl: {
        type: String,
        default: ''
    },
    premiumBannerUrls: {
        type: [String],
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
