const express = require('express');
const router = express.Router();
const Teralink = require('../models/teralink.model');
const { authMiddleware, requireAdmin } = require('../utilities/auth');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

async function getTeraboxMetadata(teraboxUrl) {
    try {
        const response = await fetch(teraboxUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        const htmlContent = await response.text();
        const dom = new JSDOM(htmlContent);
        const doc = dom.window.document;

        const getMetaContent = (property) => {
            const metaTag = doc.querySelector(`meta[property="${property}"]`);
            return metaTag ? metaTag.getAttribute('content') : '';
        };

        const videoLink = getMetaContent('og:url');
        const thumbnail = getMetaContent('og:image');
        const title = getMetaContent('og:title');

        if (!videoLink && !thumbnail && !title) {
            throw new Error('No relevant metadata found in the provided URL.');
        }

        return { videoLink, thumbnail, title };

    } catch (error) {
        throw new Error(`Error fetching TeraBox metadata: ${error.message}`);
    }
}

/**
 * @route POST /telegram-links/create
 * @desc Create or Update telegram link (Only one entry allowed - Singleton)
 * @access Private (User)
 */
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL is required'
            });
        }

        // Check if telegram link already exists
        let telegramLink = await Teralink.findOne();

        if (telegramLink) {
            // Update existing link
            telegramLink.url = url;
            telegramLink.createdBy = req.user.id;
            telegramLink.updatedAt = new Date();
            
            await telegramLink.save();

            res.status(200).json({
                success: true,
                message: 'Telegram link updated successfully',
                data: {
                    id: telegramLink._id,
                    url: telegramLink.url,
                    createdAt: telegramLink.createdAt,
                    updatedAt: telegramLink.updatedAt
                }
            });
        } else {
            // Create new link (first time)
            telegramLink = new Teralink({
                url: url,
                createdBy: req.user.id
            });

            await telegramLink.save();

            res.status(201).json({
                success: true,
                message: 'Telegram link created successfully',
                data: {
                    id: telegramLink._id,
                    url: telegramLink.url,
                    createdAt: telegramLink.createdAt,
                    updatedAt: telegramLink.updatedAt
                }
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route GET /telegram-links/get
 * @desc Get the single telegram link
 * @access Public
 */
router.get('/get', async (req, res) => {
    try {
        const telegramLink = await Teralink.findOne()
            .select('_id url createdAt updatedAt');

        if (!telegramLink) {
            return res.status(404).json({
                success: false,
                message: 'No telegram link found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: telegramLink._id,
                url: telegramLink.url,
                createdAt: telegramLink.createdAt,
                updatedAt: telegramLink.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route POST /telegram-links/update
 * @desc Update the single telegram link
 * @access Private (User)
 */
router.post('/update', authMiddleware, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL is required'
            });
        }

        const telegramLink = await Teralink.findOne();

        if (!telegramLink) {
            return res.status(404).json({
                success: false,
                message: 'No telegram link found to update'
            });
        }

        // Update the URL
        telegramLink.url = url;
        telegramLink.createdBy = req.user.id;
        telegramLink.updatedAt = new Date();
        await telegramLink.save();

        res.status(200).json({
            success: true,
            message: 'Telegram link updated successfully',
            data: {
                id: telegramLink._id,
                url: telegramLink.url,
                updatedAt: telegramLink.updatedAt   
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route POST /telegram-links/delete
 * @desc Delete the single telegram link
 * @access Private (User)
 */
router.post('/delete', authMiddleware, async (req, res) => {
    try {
        const telegramLink = await Teralink.findOne();

        if (!telegramLink) {
            return res.status(404).json({
                success: false,
                message: 'No telegram link found to delete'
            });
        }

        await telegramLink.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Telegram link deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Admin endpoints
/**
 * @route GET /telegram-links/admin/get
 * @desc Get the single telegram link with creator info (Admin only)
 * @access Private (Admin only)
 */
router.get('/admin/get', requireAdmin, async (req, res) => {
    try {
        const telegramLink = await Teralink.findOne()
            .populate('createdBy', 'name email')
            .select('_id url createdBy createdAt updatedAt');

        if (!telegramLink) {
            return res.status(404).json({
                success: false,
                message: 'No telegram link found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: telegramLink._id,
                url: telegramLink.url,
                createdBy: {
                    id: telegramLink.createdBy._id,
                    name: telegramLink.createdBy.name,
                    email: telegramLink.createdBy.email
                },
                createdAt: telegramLink.createdAt,
                updatedAt: telegramLink.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route POST /telegram-links/admin/update
 * @desc Update the single telegram link (Admin only)
 * @access Private (Admin only)
 */
router.post('/admin/update', requireAdmin, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL is required'
            });
        }

        const telegramLink = await Teralink.findOne();

        if (!telegramLink) {
            return res.status(404).json({
                success: false,
                message: 'No telegram link found to update'
            });
        }

        // Update the URL
        telegramLink.url = url;
        telegramLink.updatedAt = new Date();
        await telegramLink.save();

        res.status(200).json({
            success: true,
            message: 'Telegram link updated successfully',
            data: {
                id: telegramLink._id,
                url: telegramLink.url,
                updatedAt: telegramLink.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route POST /telegram-links/admin/delete
 * @desc Delete the single telegram link (Admin only)
 * @access Private (Admin only)
 */
router.post('/admin/delete', requireAdmin, async (req, res) => {
    try {
        const telegramLink = await Teralink.findOne();

        if (!telegramLink) {
            return res.status(404).json({
                success: false,
                message: 'No telegram link found to delete'
            });
        }

        await telegramLink.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Telegram link deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route GET /terbox/url/fetcher
 * @desc Fetch metadata from a TeraBox URL provided by user or stored in telegram link
 * @access Public
 */
router.get('/terbox/url/fetcher', async (req, res) => {
    try {
        // Accept url from query or body (for GET, query is standard)
        const userUrl = req.query.url || (req.body && req.body.url);
        let urlToFetch = userUrl;
        // let telegramLink = null;

        const telegramLink = await Teralink.findOne()
            .select('_id url createdAt updatedAt');
        // console.log('Telegram Link:', telegramLink);
        if (!telegramLink) {
            return res.status(404).json({
                success: false,
                message: 'No telegram link found'
            });
        }
        // Extract metadata from the provided or stored URL
        const metadata = await getTeraboxMetadata(urlToFetch);

        res.status(200).json({
            success: true,
            data: {
                id: telegramLink ? telegramLink._id : null,
                url: urlToFetch,
                title: metadata.title,
                thumbnail: metadata.thumbnail,
                videoLink: telegramLink.url,
                createdAt: telegramLink ? telegramLink.createdAt : null,
                updatedAt: telegramLink ? telegramLink.updatedAt : null
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