const express = require('express');
const { memeController, upload } = require('../controllers/memeController');
const router = express.Router();

// Routes
router.get('/', memeController.getAllMemes);
router.get('/templates', memeController.getTemplates);
router.get('/:id', memeController.getMemeById);
router.get('/:id/original', memeController.getOriginalImage);
router.post('/upload', upload.single('image'), memeController.uploadImage);
router.post('/create', upload.single('canvas'), memeController.createMeme);
router.put('/:id/like', memeController.likeMeme);
router.post('/:id/view', memeController.incrementViews);
router.put('/:id/share', memeController.shareMeme);
router.put('/:id', memeController.updateMeme);
router.delete('/:id', memeController.deleteMeme);

module.exports = router; 