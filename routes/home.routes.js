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
const staticResponse = {
  "file_name": "Peaky Blinders S05E04 720p BluRay Dual Audio [Hindi 2.0 + English 5.1] AAC ×264 ESub - Moweblinks.mkv",
  "download_link": "https://dm-d.terabox.app/file/aeebbee541df15073380800b581174fc?fid=81365278609555-250528-450839605716529&dstime=1749043939&rt=sh&sign=FDtAER-DCb740ccc5511e5e8fedcff06b081203-DVGVYLgN27xvvSkIa6nw%2F%2BXmG5w%3D&expires=8h&chkv=0&chkbd=0&chkpc=&dp-logid=133744601787304275&dp-callid=0&r=712101289&sh=1&region=dm",
  "thumbnail": "https://dm-data.terabox.app/thumbnail/aeebbee541df15073380800b581174fc?fid=81365278609555-250528-450839605716529&time=1749042000&rt=sh&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-guo9uEF1QIWw8LENGbgtmDIyHgE%3D&expires=8h&chkv=0&chkbd=0&chkpc=&dp-logid=133744601787304275&dp-callid=0&size=c850_u580&quality=100&vuk=-&ft=video",
  "file_size": "592.74 MB",
  "size_bytes": 621531936,
  "proxy_url": "https://terabox.0xproxy.workers.dev/proxy?url=https%3A%2F%2Fdm-d.terabox.app%2Ffile%2Faeebbee541df15073380800b581174fc%3Ffid%3D81365278609555-250528-450839605716529%26dstime%3D1749043939%26rt%3Dsh%26sign%3DFDtAER-DCb740ccc5511e5e8fedcff06b081203-DVGVYLgN27xvvSkIa6nw%252F%252BXmG5w%253D%26expires%3D8h%26chkv%3D0%26chkbd%3D0%26chkpc%3D%26dp-logid%3D133744601787304275%26dp-callid%3D0%26r%3D712101289%26sh%3D1%26region%3Ddm&file_name=Peaky%20Blinders%20S05E04%20720p%20BluRay%20Dual%20Audio%20%5BHindi%202.0%20%2B%20English%205.1%5D%20AAC%20%C3%97264%20ESub%20-%20Moweblinks.mkv"
};

router.post('/teralink', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            message: 'URL is required in request body'
        });
    }

    // You can log or validate the url here if needed
    console.log('Received URL:', url);

    // Send back static response
    res.status(200).json({
        success: true,
        data: staticResponse
    });
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
