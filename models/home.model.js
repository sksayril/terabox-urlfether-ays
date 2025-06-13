const mongoose = require('mongoose');

const homeSchema = new mongoose.Schema({    thumbnailUrl: {
        type: String,
        default: ''
    },
    premiumBannerUrl: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Home', homeSchema);
