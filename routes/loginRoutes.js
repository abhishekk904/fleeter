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
		pageTitle: 'Login',
	};
	res.status(200).render('login', payload);
});

router.post('/', async (req, res, next) => {
	const payload = {
		...req.body,
		pageTitle: 'Login',
	};
	const { logUsername, logPassword } = req.body;
	if (logUsername && logPassword) {
		const user = await User.findOne({
			$or: [{ username: logUsername }, { email: logUsername }],
		}).catch((error) => {
			console.error(error);
			payload.errorMessage = 'Something went wrong';
			res.status(200).render('login', payload);
		});
		if (user != null) {
			const result = await bcrypt.compare(
				req.body.logPassword,
				user.password
			);
			if (result === true) {
				req.session.user = user;
				return res.redirect('/');
			}
		}
		payload.errorMessage = 'Login credentials incorrect';
		return res.status(200).render('login', payload);
	}
	payload.errorMessage = 'Make sure your each field has a valid value.';
	res.status(200).render('login', payload);
});

module.exports = router;
