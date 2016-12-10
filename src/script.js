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

		const origin = { x: 600, y: 1600};

		const totalDist = datas.reduce((total, { points }) => total + points[points.length - 1].dist, 0);

		const distanceScale = d3.scaleLinear()
			.domain([0, totalDist])
			.range([Math.PI / 8 * 11, Math.PI / 8 * 13]);

		const extent = datas.reduce(([min, max], { points }) => {
			return points.reduce(([innerMin, innerMax], { ele }) => {
				return [Math.min(ele, innerMin), Math.max(ele, innerMax)];
			}, [min, max]);
		}, [Infinity, 0]);

		const elevationScale = d3.scaleLinear()
			.domain(extent)
			.range([1150, 1350]);

		const tickVals = [];

		const axis = d3.axisRight(elevationScale.copy().range(elevationScale.range().reverse()))
			.ticks(4)
			.tickFormat((num) => {
				tickVals.push(num);
				return `${num}m`;
			});

		svg.append('g')
			.call(axis)
			.attr('class', 'axis')
			.attr('transform', `translate(${origin.x}, -900)`)
			.selectAll('text')
			.attr('transform', 'rotate(1)');

		const arc = d3.arc()
			.innerRadius((d) => elevationScale(d) - 1)
			.outerRadius(elevationScale)
			.startAngle((d) => 37 / elevationScale(d))
			.endAngle(Math.PI * 2);

		svg.selectAll('.circle-axis')
			.data(tickVals)
			.enter()
			.append('path')
			.attr('class', 'circle-axis')
			.attr('d', arc)
			.attr('transform', `translate(${origin.x}, ${origin.y})`);

		let offset = 0;
		let path = '';

		datas.forEach(({ meta, points }) => {
			let maxPoint = { ele: 0 };

			const pathSegment = points.map((d) => {
				if (d.ele > maxPoint.ele) {
					maxPoint = d;
				}

				const x = dp(origin.x + elevationScale(d.ele) * Math.cos(distanceScale(d.dist + offset)), 1);
				const y = dp(origin.y + elevationScale(d.ele) * Math.sin(distanceScale(d.dist + offset)), 1);

				return `L ${x} ${y}`;
			}).join(' ');

			path += pathSegment + ' ';

			meta.startAngle = offset;
			offset += points[points.length - 1].dist;
			meta.endAngle = offset;

			meta.maxPoint = maxPoint;
		});

		datas.forEach(({ meta }) => {
			const angle = distanceScale(meta.startAngle);

			const startRadius = 1150;
			const startX = origin.x + dp(startRadius * Math.cos(angle), 1);
			const startY = origin.y + dp(startRadius * Math.sin(angle), 1);

			const endRadius = elevationScale(tickVals[tickVals.length - 1]);
			const endX = origin.x + dp(endRadius * Math.cos(angle), 1);
			const endY = origin.y + dp(endRadius * Math.sin(angle), 1);

			svg.append('path')
				.attr('d', `M ${startX} ${startY} L ${endX} ${endY}`)
				.attr('class', 'divider');

			const halfwayAngle = distanceScale((meta.startAngle + meta.endAngle) / 2);

			const textX = origin.x + dp(365 * Math.cos(halfwayAngle), 1);
			const textY = origin.y + dp(365 * Math.sin(halfwayAngle), 1);

			let degs = halfwayAngle / Math.PI * 180 + 90;

			if (degs > 135 && degs < 225) {
				degs -= 180;
			}

			const group = svg.append('g')
				.attr('transform', `translate(${textX}, ${textY}) rotate(${degs})`);

			group.append('text')
				.text(meta.name.toUpperCase())
				.attr('class', 'day')
				.attr('y', -5);

			group.append('text')
				.text(`${meta.distance} miles`)
				.attr('class', 'meta')
				.attr('y', 9);
		});

		const startX = origin.x + dp(1150 * Math.cos(distanceScale(0)), 1);
		const startY = origin.y + dp(1150 * Math.sin(distanceScale(0)), 1);
		const endX = origin.x + dp(1150 * Math.cos(distanceScale(totalDist)), 1);
		const endY = origin.y + dp(1150 * Math.sin(distanceScale(totalDist)), 1);

		svg.append('path')
			.attr('d', `M ${origin.x} ${origin.y - 500} L ${startX} ${startY} ${path} L ${endX} ${endY}`)
			.attr('class', 'data');

		datas.forEach(({ meta }) => {

			const maxAngle = distanceScale(meta.startAngle + meta.maxPoint.dist);
			const maxRadius = elevationScale(meta.maxPoint.ele) - 3;

			const maxX = origin.x + dp(maxRadius * Math.cos(maxAngle), 1);
			const maxY = origin.y + dp(maxRadius * Math.sin(maxAngle), 1);

			// Rotate by an extra 5deg
			let degs = maxAngle / Math.PI * 180 + 91;

			if (degs > 90 && degs < 270) {
				// Do previous rotation in other direction: -6
				degs = degs - 182;
			}

			const group = svg.append('g')
				.attr('transform', `translate(${maxX}, ${maxY}) rotate(${degs})`)
				.attr('class', 'max-ele');

			group.append('rect')
				.attr('width', 37)
				.attr('height', 10)
				.attr('x', 3)
				.attr('y', -6);

			group.append('text')
				.text(meta.maxPoint.ele + 'm')
				.attr('x', 5);
		});

		svg.append('circle')
			.attr('class', 'fill')
			.attr('cx', origin.x)
			.attr('cy', origin.y)
			.attr('r', 1080);

		svg.append('text')
			.text('SIX DAYS')
			.attr('class', 'title')
			.attr('x', width / 2)
			.attr('y', width / 2 - 30);

		svg.append('text')
			.text('1,018 MILES RIDDEN')
			.attr('class', 'title')
			.attr('x', width / 2)
			.attr('y', width / 2 + 10);

		svg.append('text')
			.text('50,048ft CLIMBED')
			.attr('class', 'title')
			.attr('x', width / 2)
			.attr('y', width / 2 + 50);
	});

function dp(num, figs) {
	return Math.round(num * Math.pow(10, figs)) / Math.pow(10, figs);
}