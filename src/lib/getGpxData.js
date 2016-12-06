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

				const lastPoint = points[i - 1];

				// @todo: use haversine formula
				dist += Math.pow(Math.pow(point.lat - lastPoint.lat, 2) + Math.pow(point.lon - lastPoint.lon, 2), 0.5);

				point.dist = dist;
			});

			resolve({ meta, points });
		});
	});
}

module.exports = getGpxData;