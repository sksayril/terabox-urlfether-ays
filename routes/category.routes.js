const express = require('express');
const router = express.Router();
const Category = require('../models/category.model');
const { upload } = require('../utilities/s3Config');
const { authMiddleware, requireAdmin } = require('../utilities/auth');
const jwt = require('jsonwebtoken');

// Middleware to verify user token
const verifyUserToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }
};

// Create a main category (Admin only)
router.post('/main', requireAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        
        const category = new Category({
            name,
            isMainCategory: true
        });

        await category.save();
        res.status(201).json({
            success: true,
            data: {
                categoryId: category._id,
                name: category.name,
                isMainCategory: true
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});


// Create a subcategory (Admin only)
router.post('/sub', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, parentCategoryId, title, telegramUrl, isPremium } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'Image is required' });
        }

        // Verify parent category exists and is a main category
        const parentCategory = await Category.findOne({ 
            _id: parentCategoryId,
            isMainCategory: true 
        });

        if (!parentCategory) {
            return res.status(400).json({ 
                message: 'Invalid parent category or not a main category' 
            });
        }

        const category = new Category({
            name,
            isMainCategory: false,
            parentCategory: parentCategoryId,
            title,
            imageUrl: req.file.location,
            telegramUrl,
            isPremium: isPremium === 'true'
        });

        await category.save();
        res.status(201).json({
            success: true,
            data: {
                categoryId: category._id,
                name: category.name,
                parentCategoryId: category.parentCategory,
                title: category.title,
                imageUrl: category.imageUrl,
                telegramUrl: category.telegramUrl,
                isPremium: category.isPremium
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Get all main categories
router.get('/main', requireAdmin, async (req, res) => {
    try {
        const categories = await Category.find({ isMainCategory: true })
            .select('_id name')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: categories.map(category => ({
                categoryId: category._id,
                name: category.name
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

router.get('/users/main',  async (req, res) => {
    try {
        const categories = await Category.find({ isMainCategory: true })
            .select('_id name')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: categories.map(category => ({
                categoryId: category._id,
                name: category.name
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});
// Get subcategories for a main category
router.get('/sub/:parentId', authMiddleware, async (req, res) => {
    try {
        const query = {
            parentCategory: req.params.parentId,
            isMainCategory: false
        };
        
        // If user is not premium, only show non-premium categories
        if (!req.user.isPremium) {
            query.isPremium = false;
        }

        const categories = await Category.find(query)
            .select('_id name title imageUrl telegramUrl isPremium')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: categories.map(category => ({
                categoryId: category._id,
                name: category.name,
                title: category.title,
                imageUrl: category.imageUrl,
                telegramUrl: category.telegramUrl,
                isPremium: category.isPremium
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

router.get('/users/sub/:parentId', async (req, res) => {
    try {
        const query = {
            parentCategory: req.params.parentId,
            isMainCategory: false
        };
        
        // If user is not premium, only show non-premium categories
        // if (!req.user.isPremium) {
        //     query.isPremium = false;
        // }

        const categories = await Category.find(query)
            .select('_id name title imageUrl telegramUrl isPremium')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: categories.map(category => ({
                categoryId: category._id,
                name: category.name,
                title: category.title,
                imageUrl: category.imageUrl,
                telegramUrl: category.telegramUrl,
                isPremium: category.isPremium
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});
// Get a single category with its subcategories
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('subcategories', '_id name title imageUrl telegramUrl isPremium');
        
        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Category not found' 
            });
        }

        // If it's a subcategory, check premium access
        if (!category.isMainCategory && category.isPremium && !req.user.isPremium) {
            return res.status(403).json({ 
                success: false,
                message: 'Premium content access required' 
            });
        }

        res.json({
            success: true,
            data: {
                categoryId: category._id,
                name: category.name,
                isMainCategory: category.isMainCategory,
                parentCategoryId: category.parentCategory,
                title: category.title,
                imageUrl: category.imageUrl,
                telegramUrl: category.telegramUrl,
                isPremium: category.isPremium,
                subcategories: category.subcategories?.map(sub => ({
                    categoryId: sub._id,
                    name: sub.name,
                    title: sub.title,
                    imageUrl: sub.imageUrl,
                    telegramUrl: sub.telegramUrl,
                    isPremium: sub.isPremium
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Update a category (Admin only)
router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, title, telegramUrl, isPremium } = req.body;
        const updateData = { name };

        // Only update these fields for subcategories
        if (!req.body.isMainCategory) {
            updateData.title = title;
            updateData.telegramUrl = telegramUrl;
            updateData.isPremium = isPremium === 'true';
        }

        if (req.file) {
            updateData.imageUrl = req.file.location;
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('subcategories', '_id name title imageUrl telegramUrl isPremium');

        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Category not found' 
            });
        }

        res.json({
            success: true,
            data: {
                categoryId: category._id,
                name: category.name,
                isMainCategory: category.isMainCategory,
                parentCategoryId: category.parentCategory,
                title: category.title,
                imageUrl: category.imageUrl,
                telegramUrl: category.telegramUrl,
                isPremium: category.isPremium,
                subcategories: category.subcategories?.map(sub => ({
                    categoryId: sub._id,
                    name: sub.name,
                    title: sub.title,
                    imageUrl: sub.imageUrl,
                    telegramUrl: sub.telegramUrl,
                    isPremium: sub.isPremium
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Delete a category (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Category not found' 
            });
        }

        // If it's a main category, delete all its subcategories first
        if (category.isMainCategory) {
            await Category.deleteMany({ parentCategory: category._id });
        }

        await category.deleteOne();

        res.json({ 
            success: true,
            message: 'Category deleted successfully' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// POST method endpoints for UPDATE and DELETE operations

/**
 * @route POST /categories/update-main/:id
 * @desc Update a main category (Admin only) - POST method
 * @access Private (Admin only)
 */
router.post('/update-main/:id', requireAdmin, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        const category = await Category.findOne({ 
            _id: req.params.id,
            isMainCategory: true 
        });

        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Main category not found' 
            });
        }

        category.name = name;
        await category.save();

        res.json({
            success: true,
            message: 'Main category updated successfully',
            data: {
                categoryId: category._id,
                name: category.name,
                isMainCategory: true
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
 * @route POST /categories/update-sub/:id
 * @desc Update a subcategory (Admin only) - POST method
 * @access Private (Admin only)
 */
router.post('/update-sub/:id', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, title, telegramUrl, isPremium } = req.body;

        if (!name || !title || !telegramUrl) {
            return res.status(400).json({
                success: false,
                message: 'Name, title, and telegram URL are required'
            });
        }

        const category = await Category.findOne({ 
            _id: req.params.id,
            isMainCategory: false 
        });

        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Subcategory not found' 
            });
        }

        // Update fields
        category.name = name;
        category.title = title;
        category.telegramUrl = telegramUrl;
        category.isPremium = isPremium === 'true' || isPremium === true;

        if (req.file) {
            category.imageUrl = req.file.location;
        }

        await category.save();

        res.json({
            success: true,
            message: 'Subcategory updated successfully',
            data: {
                categoryId: category._id,
                name: category.name,
                parentCategoryId: category.parentCategory,
                title: category.title,
                imageUrl: category.imageUrl,
                telegramUrl: category.telegramUrl,
                isPremium: category.isPremium
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
 * @route POST /categories/delete-main/:id
 * @desc Delete a main category and all its subcategories (Admin only) - POST method
 * @access Private (Admin only)
 */
router.post('/delete-main/:id', requireAdmin, async (req, res) => {
    try {
        const category = await Category.findOne({ 
            _id: req.params.id,
            isMainCategory: true 
        });
        
        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Main category not found' 
            });
        }

        // Delete all subcategories first
        const deletedSubcategories = await Category.deleteMany({ 
            parentCategory: category._id 
        });

        // Delete the main category
        await category.deleteOne();

        res.json({ 
            success: true,
            message: 'Main category and all subcategories deleted successfully',
            data: {
                deletedMainCategory: category.name,
                deletedSubcategoriesCount: deletedSubcategories.deletedCount
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
 * @route POST /categories/delete-sub/:id
 * @desc Delete a subcategory (Admin only) - POST method
 * @access Private (Admin only)
 */
router.post('/delete-sub/:id', requireAdmin, async (req, res) => {
    try {
        const category = await Category.findOne({ 
            _id: req.params.id,
            isMainCategory: false 
        });
        
        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Subcategory not found' 
            });
        }

        await category.deleteOne();

        res.json({ 
            success: true,
            message: 'Subcategory deleted successfully',
            data: {
                deletedCategory: category.name,
                parentCategoryId: category.parentCategory
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
 * @route POST /categories/update/:id
 * @desc Update any category (main or sub) (Admin only) - POST method
 * @access Private (Admin only)
 */
router.post('/update/:id', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, title, telegramUrl, isPremium } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Category not found' 
            });
        }

        // Update name for all categories
        category.name = name;

        // Only update these fields for subcategories
        if (!category.isMainCategory) {
            if (title) category.title = title;
            if (telegramUrl) category.telegramUrl = telegramUrl;
            if (isPremium !== undefined) category.isPremium = isPremium === 'true' || isPremium === true;

            if (req.file) {
                category.imageUrl = req.file.location;
            }
        }

        await category.save();

        res.json({
            success: true,
            message: `${category.isMainCategory ? 'Main category' : 'Subcategory'} updated successfully`,
            data: {
                categoryId: category._id,
                name: category.name,
                isMainCategory: category.isMainCategory,
                parentCategoryId: category.parentCategory,
                title: category.title,
                imageUrl: category.imageUrl,
                telegramUrl: category.telegramUrl,
                isPremium: category.isPremium
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
 * @route POST /categories/delete/:id
 * @desc Delete any category (main or sub) (Admin only) - POST method
 * @access Private (Admin only)
 */
router.post('/delete/:id', requireAdmin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Category not found' 
            });
        }

        let deletedSubcategoriesCount = 0;

        // If it's a main category, delete all its subcategories first
        if (category.isMainCategory) {
            const deletedSubcategories = await Category.deleteMany({ 
                parentCategory: category._id 
            });
            deletedSubcategoriesCount = deletedSubcategories.deletedCount;
        }

        await category.deleteOne();

        res.json({ 
            success: true,
            message: `${category.isMainCategory ? 'Main category' : 'Subcategory'} deleted successfully`,
            data: {
                deletedCategory: category.name,
                isMainCategory: category.isMainCategory,
                deletedSubcategoriesCount: deletedSubcategoriesCount
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