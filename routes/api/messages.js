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
const Notification = require('../../schema/NotificationSchema');
const NodeRSA = require('node-rsa');
const { public_key, private_key } = require('../keys');

app.use(bodyParser.urlencoded({ extended: false }));

router.post('/', async (req, res, next) => {
	if (!req.body.content || !req.body.chatId || !req.body.readBy) {
		console.log('Invalid data passed into request');
		return res.sendStatus(400);
	}
	const key_public = new NodeRSA(public_key);
	const key_private = new NodeRSA(private_key);
	const encrypted_message = key_public.encrypt(req.body.content, 'base64');

	const newMessage = {
		sender: req.session.user._id,
		content: encrypted_message,
		chat: req.body.chatId,
		readBy: [req.body.readBy],
	};

	Message.create(newMessage)
		.then(async (message) => {
			message = await message.populate('sender').execPopulate();
			message = await message.populate('chat').execPopulate();
			message = await User.populate(message, { path: 'chat.users' });

			var chat = await Chat.findByIdAndUpdate(req.body.chatId, {
				latestMessage: message,
			}).catch((error) => {
				console.log(error);
			});
			message.content = req.body.content;
			insertNotification(chat, message);

			res.status(201).send(message);
		})
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

function insertNotification(chat, message) {
	chat.users.forEach((userId) => {
		if (userId == message.sender._id.toString()) return;
		Notification.insertNotification(
			userId,
			message.sender._id,
			'new message',
			message.chat._id
		);
	});
}

module.exports = router;
