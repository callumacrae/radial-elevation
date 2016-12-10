const d3 = require('d3');

function getGpxData(path) {
	return new Promise((resolve, reject) => {
		d3.xml(path, function (err, xml) {
			if (err) {
				reject(err);
				return;
			}

			const meta = {
				name: xml.querySelector('trk > name').textContent,
				date: new Date(xml.querySelector('metadata time').textContent),
				distance: Number(xml.querySelector('metadata distance').textContent),
				duration: xml.querySelector('metadata duration').textContent,
				elevation: Number(xml.querySelector('metadata elevation').textContent)
			};

			const points = Array.from(xml.querySelectorAll('trkpt'))
				.map((point) => ({
					lat: Number(point.getAttribute('lat')),
					lon: Number(point.getAttribute('lon')),
					ele: Number(point.querySelector('ele').textContent)
				}));

			let dist = 0;
			points.forEach((point, i) => {
				if (i === 0) {
					point.dist = 0;
					return;
				}

				dist += distanceBetweenPoints(points[i - 1], point);

				point.dist = dist;
			});

			resolve({ meta, points });
		});
	});
}

// Use the haversine formula to calculate distance
function distanceBetweenPoints(pointA, pointB) {
	var RADIUS_OF_EARTH = 6371e3; // Radius of earth in metres
	var φ1 = toRadians(pointA.lat);
	var φ2 = toRadians(pointB.lat);
	var Δφ = toRadians(pointB.lat - pointA.lat);
	var Δλ = toRadians(pointB.lon - pointA.lon);

	var a = Math.pow(Math.sin(Δφ / 2), 2) + Math.cos(φ1) * Math.cos(φ2) * Math.pow(Math.sin(Δλ / 2), 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return RADIUS_OF_EARTH * c;
}

function toRadians(degs) {
	return degs / 180 * Math.PI;
}

module.exports = getGpxData;