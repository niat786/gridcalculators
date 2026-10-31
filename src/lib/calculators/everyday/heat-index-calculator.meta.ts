import { defineMeta } from '../types';

export default defineMeta({
	slug: 'heat-index-calculator',
	name: 'Heat Index Calculator',
	category: 'everyday',
	shortDescription: 'Heat index from temperature and humidity, with NWS caution levels.',
	metaTitle: 'Heat Index Calculator — NWS Feels-Like Temperature',
	metaDescription:
		'Free heat index calculator using the NWS Rothfusz regression and humidity adjustments. Enter temperature and humidity in °F or °C for the caution level.',
	icon: 'flame',
	keywords: ['heat index calculator', 'feels like temperature', 'nws heat index', 'heat stress', 'humidity heat'],
	related: ['dew-point-calculator', 'wind-chill-calculator', 'btu-calculator', 'unit-converter', 'electricity-calculator'],
	updated: '2026-10-28'
});
