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
const Chat = require('../../schema/ChatSchema');
const Message = require('../../schema/MessageSchema');

app.use(bodyParser.urlencoded({ extended: false }));

router.post('/', async (req, res, next) => {
	if (!req.body.users) {
		console.log('Request does not contain users');
		req.sendStatus(404);
	}
	let users = JSON.parse(req.body.users);
	if (users.length == 0) {
		console.log('Users array is empty');
		req.sendStatus(404);
	}
	users.push(req.session.user);

	const chatData = {
		users: users,
		isGroupChat: true,
	};

	Chat.create(chatData)
		.then((results) => res.status(200).send(results))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

router.get('/', async (req, res, next) => {
	Chat.find({ users: { $elemMatch: { $eq: req.session.user._id } } })
		.populate('users')
		.populate('latestMessage')
		.sort({ updatedAt: -1 })
		.then(async (results) => {
			if (
				req.query.unreadOnly !== undefined &&
				req.query.unreadOnly == 'true'
			) {
				results = results.filter(
					(r) =>
						r.latestMessage &&
						!r.latestMessage.readBy.includes(req.session.user._id)
				);
			}

			results = await User.populate(results, {
				path: 'latestMessage.sender',
			});
			res.status(200).send(results);
		})
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

router.get('/:chatId', async (req, res, next) => {
	Chat.findOne({
		_id: req.params.chatId,
		users: { $elemMatch: { $eq: req.session.user._id } },
	})
		.populate('users')
		.then((results) => res.status(200).send(results))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

router.get('/:chatId/messages', async (req, res, next) => {
	Message.find({ chat: req.params.chatId })
		.populate('sender')
		.then((results) => res.status(200).send(results))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

router.put('/:chatId', async (req, res, next) => {
	Chat.findByIdAndUpdate(req.params.chatId, req.body)
		.then(() => res.sendStatus(204))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

router.put('/:chatId/messages/markAsRead', async (req, res, next) => {
	Message.updateMany(
		{ chat: req.params.chatId },
		{ $addToSet: { readBy: req.session.user._id } }
	)
		.then(() => res.sendStatus(204))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

router.put(
	'/:chatId/messages/:messageId/markAsRead',
	async (req, res, next) => {
		Message.findByIdAndUpdate(req.params.messageId, {
			$addToSet: { readBy: req.session.user._id },
		})
			.then(() => res.sendStatus(204))
			.catch((error) => {
				console.log(error);
				res.sendStatus(400);
			});
	}
);

module.exports = router;
