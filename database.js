const mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.set('useFindAndModify', false);

class Database {
	constructor() {
		this.connect();
	}

	connect() {
		mongoose
			.connect(
				'mongodb+srv://admin:admin@fleeter.zh8so.mongodb.net/FleeterDB?retryWrites=true&w=majority'
			)
			.then(() => {
				console.log('Database Connected');
			})
			.catch((err) => {
				console.log('Database Disconnected ' + err);
			});
	}
}

module.exports = new Database();
