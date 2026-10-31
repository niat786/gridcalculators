import { defineCalculator, type CalculationResult, type InputValues, type SelectInput } from '../types';
import { DASH, num } from '../format';
import meta from './ip-subnet-calculator.meta';

/** Unsigned 32-bit mask for a prefix length. Prefix 0 is a special case (JS shifts wrap at 32). */
export function maskOf(prefix: number): number {
	return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

const toDotted = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
const toBinaryDotted = (n: number) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, '0')).join('.');
const addr = (a: number, b: number, c: number, d: number) => ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;

/** Parse "a.b.c.d" or "a.b.c.d/p". The menu prefix is used when the text has no /p. */
export function parseAddress(text: string, menuPrefix: string): { ip: number; prefix: number } | null {
	const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(text.trim());
	if (!m) return null;
	const o = m.slice(1, 5).map(Number);
	if (o.some((x) => x > 255)) return null;
	const prefix = Number(m[5] ?? menuPrefix);
	if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
	return { ip: addr(o[0], o[1], o[2], o[3]), prefix };
}

/** Classful class by first octet (historical, still used in reports). */
export function ipClass(ip: number): string {
	const first = ip >>> 24;
	if (first < 128) return 'Class A';
	if (first < 192) return 'Class B';
	if (first < 224) return 'Class C';
	if (first < 240) return 'Class D (multicast)';
	return 'Class E (reserved)';
}

const inRange = (ip: number, base: number, prefix: number) => ((ip & maskOf(prefix)) >>> 0) === ((base & maskOf(prefix)) >>> 0);

/** RFC 1918 private ranges, plus loopback and link-local, which are not public either. */
export function addressType(ip: number): string {
	if (inRange(ip, addr(10, 0, 0, 0), 8) || inRange(ip, addr(172, 16, 0, 0), 12) || inRange(ip, addr(192, 168, 0, 0), 16)) {
		return 'Private (RFC 1918)';
	}
	if (inRange(ip, addr(127, 0, 0, 0), 8)) return 'Loopback (127.0.0.0/8)';
	if (inRange(ip, addr(169, 254, 0, 0), 16)) return 'Link-local (169.254.0.0/16)';
	return 'Public (outside RFC 1918)';
}

const PREFIX_OPTIONS = Array.from({ length: 33 }, (_, n) => ({
	label: `/${n} · ${toDotted(maskOf(n))}`,
	value: String(n)
}));

const prefixMenu: SelectInput = {
	id: 'prefix',
	label: 'Prefix length',
	type: 'select',
	display: 'menu',
	default: '24',
	options: PREFIX_OPTIONS,
	help: 'Used only when the address has no /prefix.',
	visibleWhen: (v: InputValues) => !String(v.address).includes('/')
};

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'address',
			label: 'IPv4 address',
			type: 'text',
			default: '192.168.1.10/24',
			placeholder: '192.168.1.10/24',
			monospace: true,
			maxLength: 18,
			pattern: /^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/,
			patternMessage: 'Use IPv4 format, such as 192.168.1.10/24. IPv6 is not supported.'
		},
		prefixMenu
	],
	calculate(v): CalculationResult {
		const parsed = parseAddress(String(v.address), String(v.prefix));
		if (!parsed) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Network (CIDR)',
				summary: 'Enter an IPv4 address such as 192.168.1.10/24. Each number must be 0–255 and the prefix 0–32. IPv6 is not supported.'
			};
		}
		const { ip, prefix } = parsed;
		const mask = maskOf(prefix);
		const wildcard = (~mask) >>> 0;
		const network = (ip & mask) >>> 0;
		const broadcast = (network | wildcard) >>> 0;
		const total = 2 ** (32 - prefix);

		let first: number;
		let last: number;
		let usable: number;
		if (prefix === 32) {
			first = network;
			last = network;
			usable = 1;
		} else if (prefix === 31) {
			// RFC 3021: both addresses on a /31 are usable on point-to-point links.
			first = network;
			last = broadcast;
			usable = 2;
		} else {
			first = network + 1;
			last = broadcast - 1;
			usable = total - 2;
		}

		const summary =
			prefix === 32
				? 'A /32 is a single host address, with no separate network or broadcast address.'
				: prefix === 31
					? 'A /31 is a point-to-point link: both addresses are usable (RFC 3021).'
					: `Usable hosts run from ${toDotted(first)} to ${toDotted(last)}.`;

		return {
			primaryResult: `${toDotted(network)}/${prefix}`,
			primaryLabel: 'Network (CIDR)',
			summary,
			secondaryMetrics: [
				{ label: 'Network address', value: toDotted(network) },
				{ label: 'Broadcast address', value: toDotted(broadcast) },
				{ label: 'Subnet mask', value: toDotted(mask) },
				{ label: 'Wildcard mask', value: toDotted(wildcard) },
				{ label: 'First usable host', value: toDotted(first) },
				{ label: 'Last usable host', value: toDotted(last) },
				{ label: 'Usable hosts', value: prefix === 31 ? '2' : num(usable, 0) }
			],
			table: {
				title: 'More details',
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'value', label: 'Value', align: 'end' }
				],
				rows: [
					{ item: 'Address entered', value: toDotted(ip) },
					{ item: 'Binary subnet mask', value: toBinaryDotted(mask) },
					{ item: 'Total addresses', value: num(total, 0) },
					{ item: 'IP class', value: ipClass(ip) },
					{ item: 'Address type', value: addressType(ip) }
				]
			}
		};
	},
	content: {
		intro:
			'This IP subnet calculator works out the network, broadcast and usable host range for an IPv4 address and its CIDR prefix. It also gives the subnet mask and wildcard mask used in router and firewall rules. IPv6 is not supported.',
		howTo: [
			'Type an IPv4 address. Add the prefix with a slash, such as /24, or leave it off.',
			'If you left off the prefix, choose it from the Prefix length menu. The menu lists each mask beside its prefix.',
			'Read the network, broadcast and usable host range. The details table shows the binary mask, the address class and the address type.'
		],
		about: [
			{
				heading: 'What is an IP address and a subnet?',
				paragraphs: [
					'An IPv4 address is a 32-bit number, written as four numbers from 0 to 255 separated by dots, such as 192.168.1.10. Every device on a network needs one, so that packets can find their destination.',
					'A subnet is a block of addresses that share the same first part. The first part names the network, and the rest identifies a host inside it. The size of the first part is set by the prefix length.',
					'Splitting a network into subnets keeps traffic organised and limits how far broadcasts travel. Offices, data centres and home networks all use subnets, often without the user noticing. More helpers for developers are in the [developer tools](/developer-tools) section.'
				]
			},
			{
				heading: 'CIDR notation and the prefix',
				paragraphs: [
					'Classless Inter-Domain Routing (CIDR), described in RFC 4632, writes a network as an address and a prefix length, such as 192.168.1.0/24. The prefix is the number of leading bits that identify the network.',
					'Before CIDR, addresses came in fixed classes, with the network size set by the first octet. The calculator still reports the class for reference, but modern networks use any prefix length, which gives more flexible block sizes.',
					'A larger prefix means a smaller block. A /24 has 256 addresses, while a /16 has 65,536, and a /28 has only 16.'
				],
				table: {
					caption: 'Common prefix lengths',
					columns: ['Prefix', 'Subnet mask', 'Total addresses', 'Usable hosts'],
					rows: [
						['/8', '255.0.0.0', '16,777,216', '16,777,214'],
						['/16', '255.255.0.0', '65,536', '65,534'],
						['/24', '255.255.255.0', '256', '254'],
						['/28', '255.255.255.240', '16', '14'],
						['/30', '255.255.255.252', '4', '2'],
						['/32', '255.255.255.255', '1', '1 (a single host)']
					]
				}
			},
			{
				heading: 'Network, broadcast and usable hosts',
				paragraphs: [
					'The network address is the first address in the block. It is found by a bitwise AND of the address and the mask, which keeps the network bits and clears the rest. It names the subnet and cannot be given to a device.',
					'The broadcast address is the last address in the block. Sending to it reaches every host on the subnet. The usable range sits between these two, which is why a /24 has 254 usable hosts rather than 256.',
					'Two special cases apply. A /31 is a point-to-point link with two usable addresses, as RFC 3021 describes. A /32 is a single host route, with no separate network or broadcast address.'
				]
			},
			{
				heading: 'Private and special address ranges',
				paragraphs: [
					'RFC 1918 reserves three blocks for private networks: 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. These addresses are used inside homes and offices and are not routed on the public internet.',
					'Some other ranges have special jobs. Addresses starting with 127 are loopback, which points back to your own machine. The 169.254 range is link-local, used when a device cannot get an address from a server.',
					'Private addresses are often behind a router that uses network address translation, so many devices can share one public address. The table above shows which type your address belongs to. For how network speeds are measured, see the [bandwidth calculator](/bandwidth-calculator).'
				]
			},
			{
				heading: 'Tips for subnet planning',
				paragraphs: ['Mistakes in subnet plans cause outages that are hard to trace. Keep these points in mind:'],
				list: [
					'**Check the prefix first.** A wrong prefix changes every other number.',
					'**Leave room to grow.** Pick a block with spare addresses for future devices.',
					'**Avoid overlaps.** Two networks with overlapping ranges cannot route to each other cleanly.',
					'**Reserve the edges.** Do not assign the network or broadcast address to a device.',
					'**Learn the binary.** The [binary calculator](/binary-calculator) shows how the mask bits line up with the address.'
				]
			}
		],
		formulas: [
			{
				title: 'Subnet mask',
				expression: 'mask = 2³² − 2^(32 − p)',
				variables: [{ symbol: 'p', meaning: 'prefix length, the number of network bits (0 to 32)' }]
			},
			{
				title: 'Network and broadcast',
				expression: 'network = address AND mask,   broadcast = network OR wildcard,   wildcard = 2^(32 − p) − 1',
				variables: [
					{ symbol: 'AND, OR', meaning: 'bitwise operations on the 32-bit values' },
					{ symbol: 'wildcard', meaning: 'the inverse of the subnet mask' }
				]
			},
			{
				title: 'Usable hosts',
				expression: 'usable = 2^(32 − p) − 2   (p ≤ 30)',
				variables: [
					{ symbol: '−2', meaning: 'removes the network and broadcast addresses' },
					{ symbol: '/31, /32', meaning: 'special cases: /31 has 2 usable addresses (RFC 3021), /32 has 1' }
				]
			}
		],
		example: {
			title: '192.168.1.10 with prefix /24',
			steps: [
				'Mask: 2³² − 2⁸ = 4,294,967,040, which is 255.255.255.0.',
				'Network: 192.168.1.10 AND 255.255.255.0 = 192.168.1.0.',
				'Broadcast: 192.168.1.0 OR 0.0.0.255 = 192.168.1.255.',
				'Usable hosts: 2⁸ − 2 = 254, from 192.168.1.1 to 192.168.1.254.'
			],
			result: 'Network 192.168.1.0/24 with 254 usable hosts.'
		},
		faq: [
			{
				q: 'What does /24 mean?',
				a: 'The /24 is the prefix length: the first 24 bits identify the network and the last 8 bits identify hosts. It is the same as the subnet mask 255.255.255.0.'
			},
			{
				q: 'Why are the first and last addresses not usable?',
				a: 'The first address is the network address, which names the subnet, and the last is the broadcast address, which reaches every host. That is why a /24 has 254 usable hosts, not 256.'
			},
			{
				q: 'What is a wildcard mask?',
				a: 'It is the subnet mask flipped bit by bit. Routers and firewalls often use it in access control lists to match a range of addresses.'
			},
			{
				q: 'Which ranges count as private?',
				a: 'RFC 1918 reserves 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 for private networks. Other special ranges, such as shared address space 100.64.0.0/10, are also not public, and this tool does not flag them.'
			},
			{
				q: 'Can I use this calculator for IPv6?',
				a: 'No. It handles IPv4 addresses only. IPv6 addresses are longer, 128 bits, and use a different notation, so they need their own calculator.'
			}
		],
		sources: [
			{ title: 'RFC 4632: Classless Inter-domain Routing (CIDR)', url: 'https://www.rfc-editor.org/rfc/rfc4632' },
			{ title: 'RFC 1918: Address Allocation for Private Internets', url: 'https://www.rfc-editor.org/rfc/rfc1918' },
			{ title: 'RFC 3021: Using 31-Bit Prefixes on IPv4 Point-to-Point Links', url: 'https://www.rfc-editor.org/rfc/rfc3021' }
		]
	}
});
