const RadialElevation = require('./lib/radial-elevation');

document.querySelector('form').addEventListener('submit', (e) => {
	e.preventDefault();

	const rides = document.querySelector('#rides').value;

	fetch('/api/get_rides/' + rides)
		.then((res) => res.json())
		.then((datas) => {

			datas.forEach((data) => {
				const points = data.points = [];

				const latlng = data.data.find(({ type }) => type === 'latlng');
				const distance = data.data.find(({ type }) => type === 'distance');
				const altitude = data.data.find(({ type }) => type === 'altitude');

				for (let i = 0; i < latlng.data.length; i++) {
					points.push({
						lat: latlng.data[i][0],
						lon: latlng.data[i][1],
						ele: altitude.data[i],
						dist: distance.data[i]
					});
				}
			});

			const chart = new RadialElevation('svg', datas);
			chart.preprocessData();
			chart.drawAxis(4);
			chart.drawDaySections();
			chart.drawDistanceMarkers(50);
			chart.drawMaxElevations();
			chart.drawSplatter();
			chart.drawCentralTitle();
		});
});
