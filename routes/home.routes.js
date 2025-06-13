const express = require('express');
const router = express.Router();
const Home = require('../models/home.model');
const { upload } = require('../utilities/s3Config');
const { requireAdmin } = require('../utilities/auth');

// Upload home thumbnail (Admin only)
router.post('/thumbnail', requireAdmin, upload.single('thumbnail'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'Thumbnail image is required' 
            });
        }

        const home = await Home.findOne({ isActive: true });
        if (home) {
            home.thumbnailUrl = req.file.location;
            await home.save();        } else {
            await Home.create({
                thumbnailUrl: req.file.location
            });
        }

        res.status(201).json({
            success: true,
            data: {
                thumbnailUrl: req.file.location
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Upload premium banner (Admin only)
router.post('/premium-banner', requireAdmin, upload.single('banner'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'Premium banner image is required' 
            });
        }

        const home = await Home.findOne({ isActive: true });
        if (home) {
            home.premiumBannerUrl = req.file.location;
            await home.save();        } else {
            await Home.create({
                premiumBannerUrl: req.file.location
            });
        }

        res.status(201).json({
            success: true,
            data: {
                premiumBannerUrl: req.file.location
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get home content for public
router.get('/', async (req, res) => {
    try {
        const home = await Home.findOne({ isActive: true })
            .select('thumbnailUrl premiumBannerUrl');

        if (!home) {
            return res.status(404).json({
                success: false,
                message: 'Home content not found'
            });
        }

        res.json({
            success: true,
            data: {
                thumbnailUrl: home.thumbnailUrl,
                premiumBannerUrl: home.premiumBannerUrl
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get home content for admin
router.get('/admin', requireAdmin, async (req, res) => {
    try {
        const home = await Home.findOne({ isActive: true })
            .select('thumbnailUrl premiumBannerUrl createdAt updatedAt');

        if (!home) {
            return res.status(404).json({
                success: false,
                message: 'Home content not found'
            });
        }

        res.json({
            success: true,
            data: {
                thumbnailUrl: home.thumbnailUrl,
                premiumBannerUrl: home.premiumBannerUrl,
                createdAt: home.createdAt,
                updatedAt: home.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
