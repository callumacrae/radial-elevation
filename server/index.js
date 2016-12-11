require('dotenv').config({ silent: true });

const express = require('express');
const session = require('express-session');
const strava = require('strava-v3');

const stravaLib = require('./strava');

const app = express();

app.use(express.static('static'));

app.use(session({
	secret: 'session storage secret innit',
	resave: false,
	saveUninitialized: true
}));

app.get('/oauth/authorize', (req, res) => {
	const redirect = strava.oauth.getRequestAccessURL({
		scope: 'view_private' // We need this for privacy zones & private rides
	});
	res.redirect(302, redirect);
});

app.get('/oauth/token_exchange', (req, res) => {
	strava.oauth.getToken(req.query.code, (err, payload) => {
		if (err) {
			throw new Error(err);
		}

		req.session.access_token = payload.access_token;
		req.session.athlete = payload.athlete;

		res.send('yep done');
	});
});

app.get('/api/get_ride/:rideId', (req, res) => {
	stravaLib.getRide(req.params.rideId, req)
		.then((ride) => res.send(ride))
		.catch((err) => {
			res.status(500).send({ err: err.message });
			console.error(err);
		});
});

app.get('/api/get_rides/:rideIds', (req, res) => {
	const rides = req.params.rideIds.split(',');

	const ridePromises = rides.map((rideId) => stravaLib.getRide(rideId, req));

	Promise.all(ridePromises)
		.then((rides) => res.send(rides))
		.catch((err) => {
			res.status(500).send({ err: err.message });
			console.error(err);
		});
});

app.listen(3000, () => {
	console.log('Listening on port 3000');
});
