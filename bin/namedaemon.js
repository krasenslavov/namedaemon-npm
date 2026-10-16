#!/usr/bin/env node
import { NameDaemon, NameDaemonError, RateLimitError, VERSION } from '../src/index.js';

const HELP = `namedaemon ${VERSION}: .com domain tools from the command line (https://namedaemon.com)

Usage: namedaemon <command> [args] [--json]

Commands:
  rate <name>                 brandability score for one name
  ideas <keyword> [limit]     two-word .com ideas around a keyword
  check <name...>             status of up to 50 names (.com)
  verify <name...>            live availability of up to 10 names
  tld <label> <tld...>        one label across several extensions
  tco <tld>                   cost of ownership for an extension
  health <name>               DNS, email and registration health
  appraise <name>             strength report (no price)
  handles <name>              username availability on social platforms

Options:
  --json     print the raw JSON response
  --help     show this help
  --version  show the version
`;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const pos = args.filter((a) => !a.startsWith('--'));
const [cmd, ...rest] = pos;

if (flags.has('--version')) {
	console.log(VERSION);
	process.exit(0);
}
if (!cmd || flags.has('--help')) {
	console.log(HELP);
	process.exit(cmd || flags.has('--help') ? 0 : 1);
}

const nd = new NameDaemon();
const need = (n, usage) => {
	if (rest.length < n) {
		console.error(`Usage: namedaemon ${usage}`);
		process.exit(2);
	}
};

function pretty(cmd, r) {
	switch (cmd) {
		case 'rate':
			return `${r.name}: ${r.score ?? 'no score'} ${r.verdict ?? ''}`.trim() + (r.tips?.length ? `\n- ${r.tips.join('\n- ')}` : '');
		case 'ideas':
			return r.ideas.map((i) => `${i.domain}.com  ${i.score}`).join('\n');
		case 'check':
		case 'verify':
		case 'tld':
			return r.results.map((x) => `${x.domain}  ${x.status}${x.est_drop ? ` (drops ${x.est_drop})` : ''}`).join('\n');
		default:
			return JSON.stringify(r, null, 2);
	}
}

try {
	let res;
	switch (cmd) {
		case 'rate':
			need(1, 'rate <name>');
			res = await nd.rate(rest[0]);
			break;
		case 'ideas':
			need(1, 'ideas <keyword> [limit]');
			res = await nd.ideas(rest[0], rest[1]);
			break;
		case 'check':
			need(1, 'check <name...>');
			res = await nd.check(rest);
			break;
		case 'verify':
			need(1, 'verify <name...>');
			res = await nd.verify(rest);
			break;
		case 'tld':
			need(2, 'tld <label> <tld...>');
			res = await nd.tldCheck(rest[0], rest.slice(1));
			break;
		case 'tco':
			need(1, 'tco <tld>');
			res = await nd.tco(rest[0]);
			break;
		case 'health':
			need(1, 'health <name>');
			res = await nd.domainHealth(rest[0]);
			break;
		case 'appraise':
			need(1, 'appraise <name>');
			res = await nd.appraise(rest[0]);
			break;
		case 'handles':
			need(1, 'handles <name>');
			res = await nd.handles(rest[0]);
			break;
		default:
			console.error(`Unknown command: ${cmd}\n`);
			console.error(HELP);
			process.exit(2);
	}
	console.log(flags.has('--json') ? JSON.stringify(res, null, 2) : pretty(cmd, res));
} catch (e) {
	if (e instanceof RateLimitError) {
		console.error(`Rate limit reached. Try again in about ${e.retryAfter} seconds.`);
	} else if (e instanceof NameDaemonError) {
		console.error(`Error${e.status ? ` ${e.status}` : ''}: ${e.message}`);
	} else {
		console.error(e);
	}
	process.exit(1);
}
