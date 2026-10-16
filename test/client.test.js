import test from 'node:test';
import assert from 'node:assert/strict';
import { NameDaemon, NameDaemonError, RateLimitError } from '../src/index.js';

function mock(status, body, headers = {}) {
	const calls = [];
	const fn = async (url, init) => {
		calls.push({ url, init });
		return {
			ok: status >= 200 && status < 300,
			status,
			headers: { get: (k) => headers[k.toLowerCase()] ?? null },
			text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
		};
	};
	fn.calls = calls;
	return fn;
}

test('rate builds the query and sends a User-Agent', async () => {
	const f = mock(200, { name: 'example', score: 95.5 });
	const nd = new NameDaemon({ fetch: f });
	const r = await nd.rate('example');
	assert.equal(r.score, 95.5);
	assert.equal(f.calls[0].url, 'https://namedaemon.com/wp-json/nd/v1/rate?name=example');
	assert.match(f.calls[0].init.headers['User-Agent'], /^namedaemon-js\//);
});

test('arrays are comma joined and empty params dropped', async () => {
	const f = mock(200, { results: [] });
	await new NameDaemon({ fetch: f }).tldCheck('nova', ['com', 'io']);
	assert.equal(f.calls[0].url, 'https://namedaemon.com/wp-json/nd/v1/tld-check?label=nova&tlds=com%2Cio');
});

test('check posts JSON', async () => {
	const f = mock(200, { results: [] });
	await new NameDaemon({ fetch: f }).check(['a', 'b'], 2);
	assert.equal(f.calls[0].init.method, 'POST');
	assert.deepEqual(JSON.parse(f.calls[0].init.body), { domains: ['a', 'b'], verify: 2 });
});

test('429 raises RateLimitError with retryAfter', async () => {
	const f = mock(429, { code: 'ndt_rate_limited', message: 'Too many requests.' }, { 'retry-after': '30' });
	await assert.rejects(new NameDaemon({ fetch: f }).rate('example'), (e) => e instanceof RateLimitError && e.retryAfter === 30);
});

test('400 raises NameDaemonError with the server message', async () => {
	const f = mock(400, { code: 'rest_invalid_param', message: 'Invalid parameter(s): name' });
	await assert.rejects(new NameDaemon({ fetch: f }).rate('x1'), (e) => e instanceof NameDaemonError && e.status === 400 && /name/.test(e.message));
});

test('non-JSON success is an error', async () => {
	const f = mock(200, '<html>challenge</html>');
	await assert.rejects(new NameDaemon({ fetch: f }).rate('example'), NameDaemonError);
});

test('live smoke test (NAMEDAEMON_LIVE=1)', { skip: !process.env.NAMEDAEMON_LIVE }, async () => {
	const r = await new NameDaemon().rate('example');
	assert.equal(r.name, 'example');
	assert.equal(typeof r.score, 'number');
});
