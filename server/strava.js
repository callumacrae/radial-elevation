const strava = require('strava-v3');

function getRideMeta(id, req) {
	return new Promise((resolve, reject) => {
		strava.activities.get({
			id: id,
			access_token: req.session.access_token
		}, function (err, payload) {
			if (err) {
				return reject(err);
			}

			const meta = {};

			// We only want the basic information
			for (const key of Object.keys(payload)) {
				if (typeof payload[key] !== 'object') {
					meta[key] = payload[key];
				}
			}

			resolve(meta);
		});
	});
}

function getRideData(id, req) {
	return new Promise((resolve, reject) => {
		strava.streams.activity({
			id: id,
			types: 'latlng,distance,altitude',
			resolution: 'high',
			access_token: req.session.access_token
		}, function (err, payload) {
			if (err) {
				return reject(err);
			}

			resolve(payload);
		});
	});
}

function getRide(id, req) {
	return Promise.all([getRideMeta(id, req), getRideData(id, req)])
		.then(([meta, data]) => {
			return { meta, data };
		});
}

module.exports = {
	getRideMeta,
	getRideData,
	getRide
};