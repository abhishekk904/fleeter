const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });
const User = require('../../schema/UserSchema');
const Post = require('../../schema/PostSchema');
const Notification = require('../../schema/NotificationSchema');
const { use } = require('../loginRoutes');
const cloudinary = require('cloudinary').v2;

app.use(bodyParser.urlencoded({ extended: false }));

router.get('/', async (req, res, next) => {
	let searchObj = req.query;
	if (req.query.search !== undefined) {
		searchObj = {
			$or: [
				{ firstName: { $regex: req.query.search, $options: 'i' } },
				{ lastName: { $regex: req.query.search, $options: 'i' } },
				{ username: { $regex: req.query.search, $options: 'i' } },
			],
		};
	}
	User.find(searchObj)
		.then((results) => {
			res.status(200).send(results);
		})
		.catch((error) => {
			console.error(error);
			res.sendStatus(400);
		});
});

router.put('/:userId/follow', async (req, res, next) => {
	const userId = req.params.userId;
	const user = await User.findById(userId);

	if (user === null) return res.sendStatus(404);

	const isFollowing =
		user.followers && user.followers.includes(req.session.user._id);

	const option = isFollowing ? '$pull' : '$addToSet';
	req.session.user = await User.findByIdAndUpdate(
		req.session.user._id,
		{ [option]: { following: userId } },
		{ new: true }
	).catch((error) => {
		console.log(error);
		res.sendStatus(400);
	});

	await User.findByIdAndUpdate(userId, {
		[option]: { followers: req.session.user._id },
	}).catch((error) => {
		console.log(error);
		res.sendStatus(400);
	});

	if (!isFollowing) {
		await Notification.insertNotification(
			userId,
			req.session.user._id,
			'follow',
			req.session.user._id
		);
	}

	res.status(200).send(req.session.user);
});

router.get('/:userId/following', async (req, res, next) => {
	User.findById(req.params.userId)
		.populate('following')
		.then((results) => {
			res.status(200).send(results);
		})
		.catch((error) => {
			console.log(error);

			res.sendStatus(400);
		});
});

router.get('/:userId/followers', async (req, res, next) => {
	User.findById(req.params.userId)
		.populate('followers')
		.then((results) => {
			res.status(200).send(results);
		})
		.catch((error) => {
			console.log(error);

			res.sendStatus(400);
		});
});

router.post(
	'/profilePicture',
	upload.single('croppedImage'),
	async (req, res, next) => {
		if (!req.file) {
			console.log('No file uploaded with ajax upload');
			return res.sendStatus(400);
		}
		const filePath = `/uploads/images/${req.file.filename}.png`;
		const tempPath = req.file.path;
		const targetPath = path.join(__dirname, `../../${filePath}`);

		fs.rename(tempPath, targetPath, async (error) => {
			if (error != null) {
				conole.log(error);
				return res.sendStatus(400);
			}

			await cloudinary.uploader.upload(
				targetPath,
				async (error, result) => {
					if (error == undefined) {
						req.session.user = await User.findByIdAndUpdate(
							req.session.user._id,
							{ profilePic: result.url },
							{ new: true }
						);
						res.sendStatus(204);
					}
				}
			);
		});
	}
);

router.post(
	'/coverPhoto',
	upload.single('croppedImage'),
	async (req, res, next) => {
		if (!req.file) {
			console.log('No file uploaded with ajax upload');
			return res.sendStatus(400);
		}
		const filePath = `/uploads/images/${req.file.filename}.png`;
		const tempPath = req.file.path;
		const targetPath = path.join(__dirname, `../../${filePath}`);

		fs.rename(tempPath, targetPath, async (error) => {
			if (error != null) {
				conole.log(error);
				return res.sendStatus(400);
			}
			await cloudinary.uploader.upload(
				targetPath,
				async (error, result) => {
					if (error == undefined) {
						req.session.user = await User.findByIdAndUpdate(
							req.session.user._id,
							{ coverPhoto: result.url },
							{ new: true }
						);
						res.sendStatus(204);
					}
				}
			);
		});
	}
);

router.get('/:userId/suggestions', async (req, res, next) => {
	User.find({
		_id: { $ne: req.params.userId },
		followers: { $ne: req.params.userId },
	})
		.then((results) => {
			res.status(200).send(results);
		})
		.catch((error) => {
			console.error(error);
			res.sendStatus(400);
		});
});

module.exports = router;
