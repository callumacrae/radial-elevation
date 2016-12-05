const d3 = require('d3');
const getGpxData = require('./lib/getGpxData');

Promise.all([
	getGpxData('../data/LEJOG_Day_1.gpx'),
	getGpxData('../data/LEJOG_Day_2.gpx'),
	getGpxData('../data/LEJOG_Day_3.gpx'),
	getGpxData('../data/LEJOG_Day_4.gpx'),
	getGpxData('../data/LEJOG_Day_5.gpx'),
	getGpxData('../data/LEJOG_Day_6_All_done_.gpx')
])
	.then((datas) => {
		const svg = d3.select('svg');
		const width = svg.attr('width');
		const height = svg.attr('height');

		const totalDist = datas.reduce((total, { points }) => total + points[points.length - 1].dist, 0);

		const distanceScale = d3.scaleLinear()
			.domain([0, totalDist])
			.range([-Math.PI / 2, Math.PI / 2 * 3]);

		const extent = datas.reduce(([min, max], { points }) => {
			return points.reduce(([innerMin, innerMax], { ele }) => {
				return [Math.min(ele, innerMin), Math.max(ele, innerMax)];
			}, [min, max]);
		}, [Infinity, 0]);

		const elevationScale = d3.scaleLinear()
			.domain(extent)
			.range([150, 350]);

		let offset = 0;
		let path = '';

		datas.forEach(({ meta, points }) => {
			const pathSegment = points.map((d) => {
				const x = dp(width / 2 + elevationScale(d.ele) * Math.cos(distanceScale(d.dist + offset)), 1);
				const y = dp(height / 2 + elevationScale(d.ele) * Math.sin(distanceScale(d.dist + offset)), 1);

				return `L ${x} ${y}`;
			}).join(' ');

			path += pathSegment + ' ';

			meta.startAngle = offset;
			offset += points[points.length - 1].dist;
			meta.endAngle = offset;
		});

		datas.forEach(({ meta }) => {
			const angle = distanceScale(meta.startAngle);

			const x = dp(390 * Math.cos(angle), 1);
			const y = dp(390 * Math.sin(angle), 1);

			svg.append('path')
				.attr('d', `M ${width / 2} ${height / 2} l ${x} ${y}`)
				.attr('class', 'divider');

			const halfwayAngle = distanceScale((meta.startAngle + meta.endAngle) / 2);

			const textX = width / 2 + dp(350 * Math.cos(halfwayAngle), 1);
			const textY = height / 2 + dp(350 * Math.sin(halfwayAngle), 1);

			const degs = halfwayAngle / Math.PI * 180 + 90;

			svg.append('text')
				.text(meta.name.toUpperCase())
				.attr('class', 'day')
				.attr('transform', `translate(${textX}, ${textY}) rotate(${((degs + 90) % 180) - 90})`)
		});

		svg.append('path')
			.attr('d', `M ${path.slice(1)}`)
			.attr('class', 'data');

		svg.append('text')
			.text('LANDS END TO')
			.attr('class', 'title')
			.attr('x', width / 2)
			.attr('y', height / 2 - 20);

		svg.append('text')
			.text('JOHN O\'GROATS')
			.attr('class', 'title')
			.attr('x', width / 2)
			.attr('y', height / 2 + 20);

		svg.append('text')
			.text('2016')
			.attr('class', 'title')
			.attr('x', width / 2)
			.attr('y', height / 2 + 60);
	});

function dp(num, figs) {
	return Math.round(num * Math.pow(10, figs)) / Math.pow(10, figs);
}