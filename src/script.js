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

		const origin = { x: 400, y: 400, toString() {
			return `${this.x} ${this.y}`;
		}};

		const flip = {
			min: 112.5,
			max: 237.5
		};

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
			.attr('transform', `translate(${origin.x} ${origin.y - 500})`)
			.selectAll('text')
			.attr('transform', 'rotate(3)');

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
			.attr('transform', `translate(${origin})`);

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

			const radius = elevationScale(tickVals[tickVals.length - 1]);

			const x = dp(radius * Math.cos(angle), 1);
			const y = dp(radius * Math.sin(angle), 1);

			svg.append('path')
				.attr('d', `M ${origin} l ${x} ${y}`)
				.attr('class', 'divider');

			const halfwayAngle = distanceScale((meta.startAngle + meta.endAngle) / 2);

			const textX = origin.x + dp(365 * Math.cos(halfwayAngle), 1);
			const textY = origin.y + dp(365 * Math.sin(halfwayAngle), 1);

			let degs = halfwayAngle / Math.PI * 180 + 90;

			if (degs > flip.min && degs < flip.max) {
				degs -= 180;
			}

			const group = svg.append('g')
				.attr('transform', `translate(${textX}, ${textY}) rotate(${degs})`);

			group.append('text')
				.text(meta.name.toUpperCase())
				.attr('class', 'day')
				.attr('y', 4);

			group.append('text')
				.text(`${meta.distance} miles`)
				.attr('class', 'meta')
				.attr('y', 13);
		});

		// Draw line every 160934 metres, which is a mile
		for (let i = 160934; i < totalDist; i += 160934) {
			const angle =	distanceScale(i);

			const radius = elevationScale(tickVals[tickVals.length - 1]);

			const x = dp(radius * Math.cos(angle), 1);
			const y = dp(radius * Math.sin(angle), 1);

			svg.append('path')
				.attr('d', `M ${origin} l ${x} ${y}`)
				.attr('class', 'distance-divider');

			let degs = angle / Math.PI * 180 + 90;

			if (degs > flip.min && degs < flip.max) {
				degs -= 180;
			}

			svg.append('text')
				.text(i / 1609.34 + ' miles')
				.attr('class', 'meta meta-distance')
				.attr('transform', `translate(${origin.x + x * 1.02}, ${origin.y + y * 1.02}) rotate(${degs})`);
		}

		svg.append('path')
			.attr('d', `M ${path.slice(1)}`)
			.attr('class', 'data');

		datas.forEach(({ meta }) => {

			const maxAngle = distanceScale(meta.startAngle + meta.maxPoint.dist);
			const maxRadius = elevationScale(meta.maxPoint.ele) - 3;

			const maxX = origin.x + dp(maxRadius * Math.cos(maxAngle), 1);
			const maxY = origin.y + dp(maxRadius * Math.sin(maxAngle), 1);

			// Rotate by an extra 5deg
			let degs = maxAngle / Math.PI * 180 + 95;

			if (degs > flip.min && degs < flip.max) {
				// Do previous rotation in other direction: -10
				degs = degs - 190;
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

		svg.append('text')
			.text('SIX DAYS')
			.attr('class', 'title')
			.attr('x', origin.x)
			.attr('y', origin.y - 30);

		svg.append('text')
			.text('1,018 MILES RIDDEN')
			.attr('class', 'title')
			.attr('x', origin.x)
			.attr('y', origin.y + 10);

		svg.append('text')
			.text('50,048ft CLIMBED')
			.attr('class', 'title')
			.attr('x', origin.x)
			.attr('y', origin.y + 50);
	});

function dp(num, figs) {
	return Math.round(num * Math.pow(10, figs)) / Math.pow(10, figs);
}