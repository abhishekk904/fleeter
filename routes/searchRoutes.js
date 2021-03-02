const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const User = require('../schema/UserSchema');
const bcrypt = require('bcrypt');

router.get('/', (req, res, next) => {
	const payload = createPayload(req.session.user);
	payload.selectedTab = 'posts';
	res.status(200).render('searchPage', payload);
});

function createPayload(userLoggedIn) {
	return {
		pageTitle: 'Search',
		userLoggedIn: userLoggedIn,
		userLoggedInJs: JSON.stringify(userLoggedIn),
	};
}

router.get('/:selectedTab', (req, res, next) => {
	const payload = createPayload(req.session.user);
	if (req.params.selectedTab === 'users')
		payload.selectedTab = req.params.selectedTab;
	else payload.selectedTab = 'posts';
	res.status(200).render('searchPage', payload);
});

module.exports = router;
