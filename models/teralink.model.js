const mongoose = require('mongoose');

const teralinkSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
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



const Teralink = mongoose.model('Teralink', teralinkSchema);

module.exports = Teralink; 