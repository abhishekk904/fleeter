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
		pageTitle: 'Notification',
		userLoggedIn: req.session.user,
		userLoggedInJs: JSON.stringify(req.session.user),
	};
	res.status(200).render('notificationPage', payload);
});

module.exports = router;
