const express = require('express');
const router = express.Router();
const Teralink = require('../models/teralink.model');
const { authMiddleware, requireAdmin } = require('../utilities/auth');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const axios = require('axios');

async function getTeraBoxMetadata(teraboxUrl) {
  if (!teraboxUrl || !teraboxUrl.startsWith('http')) {
    throw new Error('Invalid TeraBox URL');
  }

  try {
    const response = await axios.get(teraboxUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000, // 10 second timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr('content') || '';
    const thumbnail = $('meta[property="og:image"]').attr('content') || '';

    return { title, thumbnail, html };
  } catch (error) {
    throw new Error(`Failed to fetch metadata: ${error.message}`);
  }
}
async function getTeraboxMetadata(teraboxUrl) {
    const FETCH_TIMEOUT = 20000; // 20 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
        const response = await fetch(teraboxUrl, {
             headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Connection': 'keep-alive'
  },
            signal: controller.signal
        });
        clearTimeout(timeout);

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

        // Return whatever data is available, even if some fields are missing
        if (!videoLink && !thumbnail && !title) {
            throw new Error('No relevant metadata found in the provided URL.');
        }

        return { videoLink, thumbnail, title };

    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out while fetching TeraBox metadata.');
        }
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
router.post('/terbox/url/fetcher', async (req, res) => {
    try {
        // Accept url from body (POST)
        const userUrl = req.body && req.body.url;
        let urlToFetch = userUrl;
                const telegramLink = await Teralink.findOne()
            .select('_id url createdAt updatedAt');

        if (!telegramLink) {
            return res.status(404).json({
                success: false,
                message: 'No telegram link found'
            });
        }

        // Call the worker API with the user's TeraBox URL
        const apiUrl = `https://terabox-latest.shraj.workers.dev/?url=${encodeURIComponent(urlToFetch)}`;
        const apiResponse = await axios.get(apiUrl, { timeout: 30000 });
        const data = apiResponse.data;

        if (!data || !data.name || !data.url) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch or parse TeraBox data.'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: telegramLink ? telegramLink._id : null,
                url: data.url,
                title: data.name,
                thumbnail: data.image,
                videoLink: telegramLink ? telegramLink.url : null,
                createdAt: telegramLink ? telegramLink.createdAt : null,
                updatedAt: telegramLink ? telegramLink.updatedAt : null,
                // Optionally include all download_links if you want
                download_links: data.download_links || {}
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