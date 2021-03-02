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

app.use(bodyParser.urlencoded({ extended: false }));

router.get('/', async (req, res, next) => {
	const searchObj = req.query;

	if (searchObj.isReply !== undefined) {
		const isReply = searchObj.isReply == 'true';
		searchObj.replyTo = { $exists: isReply };
		delete searchObj.isReply;
	}

	if (searchObj.search !== undefined) {
		searchObj.content = { $regex: searchObj.search, $options: 'i' };
		delete searchObj.search;
	}

	if (searchObj.followingOnly !== undefined) {
		const followingOnly = searchObj.followingOnly == 'true';

		if (followingOnly) {
			const objectIds = [...req.session.user.following];

			objectIds.push(req.session.user._id);
			searchObj.postedBy = { $in: objectIds };
		}
		delete searchObj.followingOnly;
	}

	const results = await getPost(searchObj);
	res.status(200).send(results);
});

router.get('/:id', async (req, res, next) => {
	const postId = req.params.id;
	let postData = await getPost({ _id: postId });
	postData = postData[0];

	let results = {
		postData: postData,
	};

	if (postData.replyTo !== undefined) {
		results.replyTo = postData.replyTo;
	}

	results.replies = await getPost({ replyTo: postId });

	res.status(200).send(results);
});

router.post('/', upload.single('croppedImage'), async (req, res, next) => {
	if (!req.body.content) {
		console.log('Content param not sent with request');
		return res.sendStatus(400);
	}

	const postData = {
		content: req.body.content,
		postedBy: req.session.user,
	};

	if (req.body.replyTo) {
		postData.replyTo = req.body.replyTo;
	}
	if (req.file) {
		// console.log('Hello');
		const filePath = `/uploads/images/${req.file.filename}.png`;
		const tempPath = req.file.path;
		const targetPath = path.join(__dirname, `../../${filePath}`);

		fs.rename(tempPath, targetPath, async (error) => {
			if (error != null) {
				conole.log(error);
				res.sendStatus(400);
			}
			postData.postPhoto = filePath;
			Post.create(postData)
				.then(async (newPost) => {
					newPost = await User.populate(newPost, {
						path: 'postedBy',
					});
					newPost = await Post.populate(newPost, {
						path: 'replyTo',
					});

					if (
						newPost.replyTo !== undefined &&
						newPost.replyTo.postedBy != req.session.user._id
					) {
						await Notification.insertNotification(
							newPost.replyTo.postedBy,
							req.session.user._id,
							'reply',
							newPost._id
						);
					}

					res.status(201).send(newPost);
				})
				.catch((error) => {
					console.log(error);
					return res.sendStatus(400);
				});
		});
	} else {
		Post.create(postData)
			.then(async (newPost) => {
				newPost = await User.populate(newPost, { path: 'postedBy' });
				newPost = await Post.populate(newPost, {
					path: 'replyTo',
				});

				if (
					newPost.replyTo !== undefined &&
					newPost.replyTo.postedBy != req.session.user._id
				) {
					await Notification.insertNotification(
						newPost.replyTo.postedBy,
						req.session.user._id,
						'reply',
						newPost._id
					);
				}

				res.status(201).send(newPost);
			})
			.catch((error) => {
				console.log(error);
				res.sendStatus(400);
			});
	}
});

router.put('/:id/like', async (req, res, next) => {
	const postId = req.params.id;
	const userId = req.session.user._id;

	const isLiked =
		req.session.user.likes && req.session.user.likes.includes(postId);

	const option = isLiked ? '$pull' : '$addToSet';
	req.session.user = await User.findByIdAndUpdate(
		userId,
		{ [option]: { likes: postId } },
		{ new: true }
	).catch((error) => {
		console.log(error);
		res.sendStatus(400);
	});

	const post = await Post.findByIdAndUpdate(
		postId,
		{ [option]: { likes: userId } },
		{ new: true }
	).catch((error) => {
		console.log(error);
		res.sendStatus(400);
	});

	if (!isLiked) {
		if (post.postedBy != userId) {
			await Notification.insertNotification(
				post.postedBy,
				userId,
				'postLike',
				post._id
			);
		}
	}

	res.status(200).send(post);
});

router.post('/:id/retweet', async (req, res, next) => {
	const postId = req.params.id;
	const userId = req.session.user._id;

	const deletedpost = await Post.findOneAndDelete({
		postedBy: userId,
		retweetData: postId,
	}).catch((error) => {
		console.log(error);
		res.sendStatus(400);
	});

	const option = deletedpost !== null ? '$pull' : '$addToSet';

	let repost = deletedpost;

	if (repost === null) {
		repost = await Post.create({
			postedBy: userId,
			retweetData: postId,
		}).catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
	}

	req.session.user = await User.findByIdAndUpdate(
		userId,
		{ [option]: { retweet: repost._id } },
		{ new: true }
	).catch((error) => {
		console.log(error);
		res.sendStatus(400);
	});

	const post = await Post.findByIdAndUpdate(
		postId,
		{ [option]: { retweetUsers: userId } },
		{ new: true }
	).catch((error) => {
		console.log(error);
		res.sendStatus(400);
	});

	if (!deletedpost) {
		if (post.postedBy != userId) {
			await Notification.insertNotification(
				post.postedBy,
				userId,
				'retweet',
				post._id
			);
		}
	}

	res.status(200).send(post);
});

router.delete('/:id', (req, res, next) => {
	Post.findByIdAndDelete(req.params.id)
		.then(() => res.sendStatus(202))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

router.put('/:id', async (req, res, next) => {
	if (req.body.pinned !== undefined) {
		await Post.updateMany(
			{ postedBy: req.session.user },
			{ pinned: false }
		).catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
	}

	Post.findByIdAndUpdate(req.params.id, req.body)
		.then(() => res.sendStatus(204))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

async function getPost(filter) {
	let results = await Post.find(filter)
		.populate('postedBy')
		.populate('retweetData')
		.populate('replyTo')
		.sort({ createdAt: -1 })
		.catch((error) => {
			console.log(error);
		});

	results = await User.populate(results, {
		path: 'replyTo.postedBy',
	});

	return await User.populate(results, {
		path: 'retweetData.postedBy',
	});
}

module.exports = router;
