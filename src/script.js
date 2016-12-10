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
		const chart = new RadialElevation('svg', datas);
		chart.preprocessData();
		chart.drawAxis(4);
		chart.drawDaySections();
		chart.drawDistanceMarkers(50);
		chart.drawSplatter();
		chart.drawMaxElevations();
		chart.drawCentralTitle();
	});

function RadialElevation(selector, datas) {
	this.svg = d3.select(selector);

	this.config = {
		origin: { x: 400, y: 400, toString() {
			return `${this.x} ${this.y}`;
		}},
		flip: {
			enabled: false,
			min: 112.5,
			max: 237.5
		},
		distanceUnits: 'miles'
	};

	this.datas = datas;

	this.totalDist = datas.reduce((total, { points }) => total + points[points.length - 1].dist, 0);

	const distanceScale = d3.scaleLinear()
		.domain([0, this.totalDist])
		.range([-Math.PI / 2, Math.PI / 2 * 3]);

	const extent = datas.reduce(([min, max], { points }) => {
		return points.reduce(([innerMin, innerMax], { ele }) => {
			return [Math.min(ele, innerMin), Math.max(ele, innerMax)];
		}, [min, max]);
	}, [Infinity, 0]);

	const elevationScale = d3.scaleLinear()
		.domain(extent)
		.range([150, 350]);

	this.scales = {
		distance: distanceScale,
		elevation: elevationScale
	};
}

RadialElevation.prototype.preprocessData = function () {
	let offset = 0;
	let path = '';

	this.datas.forEach(({ meta, points }) => {
		let maxPoint = { ele: 0 };

		const pathSegment = points.map((d) => {
			if (d.ele > maxPoint.ele) {
				maxPoint = d;
			}

			const x = dp(this.config.origin.x + this.scales.elevation(d.ele) * Math.cos(this.scales.distance(d.dist + offset)), 1);
			const y = dp(this.config.origin.y + this.scales.elevation(d.ele) * Math.sin(this.scales.distance(d.dist + offset)), 1);

			return `L ${x} ${y}`;
		}).join(' ');

		path += pathSegment + ' ';

		meta.startAngle = offset;
		offset += points[points.length - 1].dist;
		meta.endAngle = offset;

		meta.maxPoint = maxPoint;
	});

	this.pathData = path;
};

RadialElevation.prototype.drawAxis = function (ticks) {
	const tickVals = this.tickVals = [];

	const reverseScale = this.scales.elevation.copy().range(this.scales.elevation.range().reverse());

	const axis = d3.axisRight(reverseScale)
		.ticks(ticks)
		.tickFormat((num) => {
			tickVals.push(num);
			return `${num}m`;
		});

	this.svg.append('g')
		.call(axis)
		.attr('class', 'axis')
		.attr('transform', `translate(${this.config.origin.x} ${this.config.origin.y - 500})`)
		.selectAll('text')
		.attr('transform', 'rotate(3)');

	const arc = d3.arc()
		.innerRadius((d) => this.scales.elevation(d) - 1)
		.outerRadius(this.scales.elevation)
		.startAngle((d) => 37 / this.scales.elevation(d))
		.endAngle(Math.PI * 2);

	this.svg.selectAll('.circle-axis')
		.data(tickVals)
		.enter()
		.append('path')
		.attr('class', 'circle-axis')
		.attr('d', arc)
		.attr('transform', `translate(${this.config.origin})`);
};

RadialElevation.prototype.drawDaySections = function () {
	const days = this.svg.selectAll('.day')
		.data(this.datas)
		.enter()
		.append('g');

	days.append('path')
		.attr('d', ({ meta }) => {
			const angle = this.scales.distance(meta.startAngle);

			const radius = this.scales.elevation(this.tickVals[this.tickVals.length - 1]);

			const x = dp(radius * Math.cos(angle), 1);
			const y = dp(radius * Math.sin(angle), 1);

			return `M ${this.config.origin} l ${x} ${y}`;
		})
		.attr('class', 'divider');

	const dayTitles = days.append('g')
		.attr('transform', ({ meta }) => {
			const halfwayAngle = this.scales.distance((meta.startAngle + meta.endAngle) / 2);

			const textX = this.config.origin.x + dp(365 * Math.cos(halfwayAngle), 1);
			const textY = this.config.origin.y + dp(365 * Math.sin(halfwayAngle), 1);

			let degs = halfwayAngle / Math.PI * 180 + 90;

			if (this.config.flip.enabled && (degs > this.config.flip.min && degs < this.config.flip.max)) {
				degs -= 180;
			}

			return `translate(${textX}, ${textY}) rotate(${degs})`;
		});

	dayTitles.append('text')
		.text(({ meta }) => meta.name.toUpperCase())
		.attr('class', 'day')
		.attr('y', 4);

	dayTitles.append('text')
		.text(({ points }) => this._formatDistance(points[points.length - 1].dist))
		.attr('class', 'meta')
		.attr('y', 13);
};

RadialElevation.prototype.drawDistanceMarkers = function (every) {
	const factor = every * (this.config.distanceUnits === 'km' ? 1000 : 1609.34);

	for (let i = 1; i * factor < this.totalDist; i++) {
		const angle =	this.scales.distance(i * factor);

		const radius = this.scales.elevation(this.tickVals[this.tickVals.length - 1]);

		const x = dp(radius * Math.cos(angle), 1);
		const y = dp(radius * Math.sin(angle), 1);

		this.svg.append('path')
			.attr('d', `M ${this.config.origin} l ${x} ${y}`)
			.attr('class', 'distance-divider');

		let degs = angle / Math.PI * 180 + 90;

		if (this.config.flip.enabled && (degs > this.config.flip.min && degs < this.config.flip.max)) {
			degs -= 180;
		}

		this.svg.append('text')
			.text(this._formatDistance(i * factor))
			.attr('class', 'meta meta-distance')
			.attr('transform', `translate(${this.config.origin.x + x * 1.02}, ${this.config.origin.y + y * 1.02}) rotate(${degs})`);
	}
};

RadialElevation.prototype.drawSplatter = function () {
	this.svg.append('path')
		.attr('d', `M ${this.pathData.slice(1)}`)
		.attr('class', 'data');
};

RadialElevation.prototype.drawMaxElevations = function () {
	const groups = this.svg.selectAll('.max-ele')
		.data(this.datas)
		.enter()
		.append('g')
		.attr('transform', ({ meta }) => {
			const maxAngle = this.scales.distance(meta.startAngle + meta.maxPoint.dist);
			const maxRadius = this.scales.elevation(meta.maxPoint.ele) - 3;

			const maxX = this.config.origin.x + dp(maxRadius * Math.cos(maxAngle), 1);
			const maxY = this.config.origin.y + dp(maxRadius * Math.sin(maxAngle), 1);

			// Rotate by an extra 5deg
			let degs = maxAngle / Math.PI * 180 + 95;

			if (this.config.flip.enabled && (degs > this.config.flip.min && degs < this.config.flip.max)) {
				// Do previous rotation in other direction: -10
				degs = degs - 190;
			}

			return `translate(${maxX}, ${maxY}) rotate(${degs})`;
		})
		.attr('class', 'max-ele');

	// Text background
	groups.append('rect')
		.attr('width', 37)
		.attr('height', 10)
		.attr('x', 3)
		.attr('y', -6);

	groups.append('text')
		.text(({ meta }) => meta.maxPoint.ele + 'm')
		.attr('x', 5);
};

RadialElevation.prototype.drawCentralTitle = function () {
	this.svg.append('text')
		.text('SIX DAYS')
		.attr('class', 'title')
		.attr('x', this.config.origin.x)
		.attr('y', this.config.origin.y - 30);

	this.svg.append('text')
		.text('1,018 MILES RIDDEN')
		.attr('class', 'title')
		.attr('x', this.config.origin.x)
		.attr('y', this.config.origin.y + 10);

	this.svg.append('text')
		.text('50,048ft CLIMBED')
		.attr('class', 'title')
		.attr('x', this.config.origin.x)
		.attr('y', this.config.origin.y + 50);
};

RadialElevation.prototype._formatDistance = function (num, figs = 0) {
	const factor = this.config.distanceUnits === 'km' ? 1000 : 1609.34;
	return `${dp(num / factor, figs)} ${this.config.distanceUnits}`;
};

function dp(num, figs) {
	return Math.round(num * Math.pow(10, figs)) / Math.pow(10, figs);
}
