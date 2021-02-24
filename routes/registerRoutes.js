const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const User = require('../schema/UserSchema');
const bcrypt = require('bcrypt');

app.set('view engine', 'pug');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));

router.get('/', (req, res, next) => {
	const payload = {
		pageTitle: 'Register',
	};
	res.status(200).render('register', payload);
});

router.post('/', async (req, res, next) => {
	let { firstName, lastName, username, email, password } = req.body;
	firstName = firstName.trim();
	lastName = lastName.trim();
	username = username.trim();
	email = email.trim();
	const payload = {
		...req.body,
		pageTitle: 'Register',
	};

	if (firstName && lastName && username && email && password) {
		const user = await User.findOne({
			$or: [{ username: username }, { email: email }],
		}).catch((error) => {
			console.error(error);
			payload.errorMessage = 'Something went wrong';
			res.status(200).render('register', payload);
		});
		if (user == null) {
			const data = req.body;
			data.password = await bcrypt.hash(password, 10);
			User.create(data).then((user) => {
				req.session.user = user;
				return res.redirect('/');
			});
		} else {
			if (email == user.email) {
				payload.errorMessage = 'Email already in use';
			} else {
				payload.errorMessage = 'Username already in use';
			}
			res.status(200).render('register', payload);
		}
	} else {
		payload.errorMessage = 'Make sure each field has valid value';
		res.status(200).render('register', payload);
	}
});

module.exports = router;
