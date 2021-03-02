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

app.use(bodyParser.urlencoded({ extended: false }));

router.get('/', async (req, res, next) => {
	let searchObj = {
		userTo: req.session.user._id,
		notificationType: { $ne: 'new message' },
	};

	if (req.query.unreadOnly !== undefined && req.query.unreadOnly == 'true') {
		searchObj.opened = false;
	}

	Notification.find(searchObj)
		.populate('userto')
		.populate('userFrom')
		.sort({ createdAt: -1 })
		.then((results) => res.status(200).send(results))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

router.put('/:id/markAsOpened', async (req, res, next) => {
	Notification.findByIdAndUpdate(req.params.id, { opened: true })
		.then(() => res.sendStatus(200))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

router.put('/markAsOpened', async (req, res, next) => {
	Notification.updateMany({ userTo: req.session.user._id }, { opened: true })
		.then(() => res.sendStatus(200))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

router.get('/latest', async (req, res, next) => {
	Notification.findOne({
		userTo: req.session.user._id,
	})
		.populate('userto')
		.populate('userFrom')
		.sort({ createdAt: -1 })
		.then((results) => res.status(200).send(results))
		.catch((error) => {
			console.log(error);
			res.sendStatus(400);
		});
});

module.exports = router;
