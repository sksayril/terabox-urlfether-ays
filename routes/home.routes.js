const express = require('express');
const router = express.Router();
const Home = require('../models/home.model');
const { upload, handleS3UploadError } = require('../utilities/s3Config');
const { requireAdmin } = require('../utilities/auth');

// Upload home thumbnail (Admin only)
router.post('/thumbnail', requireAdmin, upload.single('thumbnail'), handleS3UploadError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'Thumbnail image is required' 
            });
        }

        const { url, searchableUrl } = req.body;
        const thumbnailData = {
            path: req.file.location,
            url: url || 'http://'
        };

        const home = await Home.findOne({ isActive: true });
        if (home) {
            home.thumbnailUrl = thumbnailData;
            home.searchableUrl = searchableUrl || '';
            await home.save();
        } else {
            await Home.create({
                thumbnailUrl: thumbnailData,
                searchableUrl: searchableUrl || ''
            });
        }

        res.status(201).json({
            success: true,
            data: {
                thumbnailUrl: thumbnailData,
                searchableUrl: searchableUrl || ''
            }
        });
    } catch (error) {
        console.error('Error in thumbnail upload:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Upload premium banner (Admin only)
router.post('/premium-banner', requireAdmin, upload.array('banners', 5), handleS3UploadError, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Premium banner images are required' 
            });
        }

        const urls = req.body.urls ? 
            (Array.isArray(req.body.urls) ? req.body.urls : [req.body.urls]) : 
            Array(req.files.length).fill('http://');

        // Create banner data with path and url
        const bannerData = req.files.map((file, index) => ({
            path: file.location,
            url: urls[index] || 'http://'
        }));

        const home = await Home.findOne({ isActive: true });
        if (home) {
            // Make sure premiumBannerUrls is always an array
            const existingUrls = Array.isArray(home.premiumBannerUrls) ? home.premiumBannerUrls : [];
            // Add new banner data to the array
            home.premiumBannerUrls = [...existingUrls, ...bannerData];
            await home.save();
        } else {
            await Home.create({
                premiumBannerUrls: bannerData
            });
        }

        res.status(201).json({
            success: true,
            data: {
                premiumBannerUrls: home ? home.premiumBannerUrls : bannerData
            }
        });
    } catch (error) {
        console.error('Error in premium-banner upload:', error);
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
            .select('thumbnailUrl premiumBannerUrls searchableUrl');
        if (!home) {
            return res.status(404).json({
                success: false,
                message: 'Home content not found'
            });
        }

        res.json({
            success: true,
            data: {
                thumbnailUrl: home.thumbnailUrl || { path: '', url: 'http://' },
                premiumBannerUrls: home.premiumBannerUrls || [],
                searchableUrl: home.searchableUrl || ''
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
