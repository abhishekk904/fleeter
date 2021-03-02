const express = require('express');
const mongoose = require('mongoose');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const User = require('../schema/UserSchema');
const bcrypt = require('bcrypt');
const Chat = require('../schema/ChatSchema');

router.get('/', (req, res, next) => {
	const payload = {
		pageTitle: 'Inbox',
		userLoggedIn: req.session.user,
		userLoggedInJs: JSON.stringify(req.session.user),
	};
	res.status(200).render('inboxPage', payload);
});

router.get('/new', (req, res, next) => {
	const payload = {
		pageTitle: 'New message',
		userLoggedIn: req.session.user,
		userLoggedInJs: JSON.stringify(req.session.user),
	};
	res.status(200).render('newMessage', payload);
});

router.get('/:chatId', async (req, res, next) => {
	const userId = req.session.user._id;
	const chatId = req.params.chatId;
	const isValid = mongoose.isValidObjectId(chatId);

	const payload = {
		pageTitle: 'Chat',
		userLoggedIn: req.session.user,
		userLoggedInJs: JSON.stringify(req.session.user),
	};

	if (!isValid) {
		payload.errorMessage = 'Chat does not exist';
		res.status(200).render('chatPage', payload);
	}

	let chat = await Chat.findOne({
		_id: chatId,
		users: { $elemMatch: { $eq: userId } },
	}).populate('users');

	if (chat == null) {
		const userFound = await User.findById(chatId);
		if (userFound != null) {
			chat = await getChatByUserId(userFound._id, userId);
		}
	}

	if (chat == null) {
		payload.errorMessage = 'Chat does not exist';
	} else payload.chat = chat;
	res.status(200).render('chatPage', payload);
});

function getChatByUserId(userLoggedInId, otherUserId) {
	return Chat.findOneAndUpdate(
		{
			isGroupChat: false,
			users: {
				$size: 2,
				$all: [
					{
						$elemMatch: {
							$eq: mongoose.Types.ObjectId(userLoggedInId),
						},
					},
					{
						$elemMatch: {
							$eq: mongoose.Types.ObjectId(otherUserId),
						},
					},
				],
			},
		},
		{
			$setOnInsert: {
				users: [userLoggedInId, otherUserId],
			},
		},
		{
			new: true,
			upsert: true,
		}
	).populate('users');
}

module.exports = router;
