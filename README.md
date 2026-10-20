# namedaemon

JavaScript client and command-line tool for [NameDaemon](https://namedaemon.com), a free set of .com domain tools: availability,
brandability scores, name ideas, extension costs, domain health and more. No API key, no dependencies.

```
npm install namedaemon
```

Needs Node 18 or newer (it uses the built-in `fetch`). ESM only.

## Command line

```
npx namedaemon rate example
npx namedaemon ideas nova 10
npx namedaemon check nova novax mybrand
npx namedaemon tld nova com io ai
npx namedaemon tco io
npx namedaemon health example
npx namedaemon appraise example --json
```

Add `--json` to any command for the raw response.

## Library

```js
import { NameDaemon } from 'namedaemon';

const nd = new NameDaemon();

const r = await nd.rate('example');
console.log(r.score, r.verdict); // 95.5 Excellent

const { ideas } = await nd.ideas('nova', 10);
const { results } = await nd.check(['nova', 'novax']);
const cost = await nd.tco('io', { years: 5 });
const health = await nd.domainHealth('example');
```

| Method | What it returns |
|---|---|
| `rate(name)` | brandability score, verdict, breakdown, tips |
| `ideas(keyword, limit?)` | two-word .com ideas built around a keyword |
| `check(names, verify?)` | zone status of up to 50 names, optional live checks |
| `verify(names)` | live availability of up to 10 names |
| `tldCheck(label, tlds)` | one label across up to 12 extensions |
| `tco(tld, options?)` | registration, renewal and total cost by registrar |
| `hacks({ word })` | domain hacks such as `hack.er` |
| `names({ seeds, vibe, count })` | brand-name generator |
| `domainHealth(name)` | registration, DNS, email and blocklist checks |
| `appraise(name, deep?)` | strength report (no price) |
| `handles(name)` | username availability on social platforms |
| `web3(name)`, `screen(name)`, `hosting()`, `trend(keyword)` | ENS/Solana names, name screening, hosting share, keyword trend |
| `get(path, params)`, `post(path, body)` | any other public route under `/wp-json/nd/v1/` |

Types are included. Every method returns the JSON of the matching [REST route](https://namedaemon.com).

### Options

```js
new NameDaemon({ timeout: 20000, retries: 1, baseUrl: 'https://namedaemon.com/wp-json/nd/v1' });
```

### Errors and rate limits

The public API is free and shared, so it limits each visitor to roughly 20 requests a minute. Heavier routes count for more.
When the limit is hit the client throws `RateLimitError` (with `retryAfter` in seconds, 60 by default); set `retries` to wait
and retry automatically. Other failures throw `NameDaemonError` with `status`, `code` and the server's `message`.

```js
import { RateLimitError } from 'namedaemon';
try { await nd.rate('example'); } catch (e) { if (e instanceof RateLimitError) console.log(e.retryAfter); }
```

Please keep usage reasonable. For bulk work, see the paid plan at https://namedaemon.com.

## Links

- Website and free tools: https://namedaemon.com
- Issues: https://github.com/namedaemon/namedaemon-npm/issues
- Python version: `pip install namedaemon`
- Developer page: https://namedaemon.com/developers/

MIT license.
