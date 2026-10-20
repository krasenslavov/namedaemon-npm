// NameDaemon client for the public REST layer (https://namedaemon.com/wp-json/nd/v1).
// Zero dependencies; needs the built-in fetch (Node 18+, browsers, Deno, Bun).

export const VERSION = '0.2.1';
export const DEFAULT_BASE_URL = 'https://namedaemon.com/wp-json/nd/v1';

export class NameDaemonError extends Error {
	constructor(message, { status = 0, code = '', body = null } = {}) {
		super(message);
		this.name = 'NameDaemonError';
		this.status = status;
		this.code = code;
		this.body = body;
	}
}

export class RateLimitError extends NameDaemonError {
	constructor(message, opts = {}) {
		super(message, opts);
		this.name = 'RateLimitError';
		this.retryAfter = opts.retryAfter ?? 60;
	}
}

function toQuery(params) {
	const q = new URLSearchParams();
	for (const [k, v] of Object.entries(params || {})) {
		if (v === undefined || v === null || v === '') continue;
		q.set(k, Array.isArray(v) ? v.join(',') : String(v));
	}
	const s = q.toString();
	return s ? `?${s}` : '';
}

export class NameDaemon {
	/**
	 * @param {object} [options]
	 * @param {string} [options.baseUrl]  API root, default the public NameDaemon REST layer.
	 * @param {number} [options.timeout]  Milliseconds, default 20000.
	 * @param {number} [options.retries]  Retries on HTTP 429 (waits retryAfter, max 60 s each), default 0.
	 * @param {typeof fetch} [options.fetch]  Custom fetch implementation.
	 * @param {string} [options.userAgent]  Sent where the runtime allows it (Node, Deno, Bun).
	 * @param {string} [options.apiKey]  A Pro+ or Business API key (sent as X-ND-API-Key). Defaults to the NAMEDAEMON_API_KEY environment variable when there is one.
	 */
	constructor(options = {}) {
		this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
		this.timeout = options.timeout ?? 20000;
		this.retries = options.retries ?? 0;
		this._fetch = options.fetch || globalThis.fetch;
		this.userAgent = options.userAgent || `namedaemon-js/${VERSION}`;
		this.apiKey = options.apiKey || (typeof process !== 'undefined' && process.env && process.env.NAMEDAEMON_API_KEY) || '';
		if (typeof this._fetch !== 'function') {
			throw new NameDaemonError('No fetch available. Use Node 18+ or pass options.fetch.');
		}
	}

	async _request(method, path, { params, json } = {}) {
		const url = `${this.baseUrl}/${path.replace(/^\/+/, '')}${toQuery(params)}`;
		const headers = { Accept: 'application/json', 'User-Agent': this.userAgent };
		if (this.apiKey) {
			headers['X-ND-API-Key'] = this.apiKey;
		}
		const init = { method, headers };
		if (json !== undefined) {
			headers['Content-Type'] = 'application/json';
			init.body = JSON.stringify(json);
		}
		for (let attempt = 0; ; attempt++) {
			const ctl = new AbortController();
			const timer = setTimeout(() => ctl.abort(), this.timeout);
			let res;
			try {
				res = await this._fetch(url, { ...init, signal: ctl.signal });
			} catch (e) {
				throw new NameDaemonError(e.name === 'AbortError' ? 'Request timed out' : `Network error: ${e.message}`);
			} finally {
				clearTimeout(timer);
			}
			const text = await res.text();
			let body = null;
			try {
				body = text ? JSON.parse(text) : null;
			} catch {
				body = null;
			}
			if (res.ok) {
				if (body === null) throw new NameDaemonError('Response was not JSON', { status: res.status });
				return body;
			}
			const message = (body && body.message) || `HTTP ${res.status}`;
			const code = (body && body.code) || '';
			if (res.status === 429) {
				const hdr = Number(res.headers.get('retry-after'));
				const retryAfter = Number.isFinite(hdr) && hdr > 0 ? hdr : 60;
				if (attempt < this.retries) {
					await new Promise((r) => setTimeout(r, Math.min(retryAfter, 60) * 1000));
					continue;
				}
				throw new RateLimitError(message, { status: 429, code, body, retryAfter });
			}
			throw new NameDaemonError(message, { status: res.status, code, body });
		}
	}

	/** Any public GET route, e.g. get('trend', { keyword: 'ai' }). */
	get(path, params) {
		return this._request('GET', path, { params });
	}

	/** Any public POST route with a JSON body. */
	post(path, json) {
		return this._request('POST', path, { json });
	}

	/** Brandability score and breakdown for a single name (4-24 letters). */
	rate(name) {
		return this.get('rate', { name });
	}

	/** Two-word .com ideas built around a keyword (3-14 letters). */
	ideas(q, limit) {
		return this.get('ideas', { q, limit });
	}

	/** Live availability check for up to 10 names. */
	verify(domains) {
		return this.post('verify', { domains });
	}

	/** Zone-based status for up to 50 names, with optional live checks (0-10). */
	check(domains, verify = 0) {
		return this.post('check', { domains, verify });
	}

	/** One label across several extensions (max 12), e.g. tldCheck('nova', ['com','io']). */
	tldCheck(label, tlds) {
		return this.get('tld-check', { label, tlds });
	}

	/** Total cost of ownership for an extension, or a ranking with { q, scope, sort, limit }. */
	tco(tld, options = {}) {
		return this.get('tco', { tld, ...options });
	}

	/** Domain hacks (e.g. hack.er). Pass { word } or { keyword, mode }. */
	hacks(options) {
		return this.get('hacks', options);
	}

	/** Brand-name generator: names({ seeds: ['nova','cloud'], vibe, count, hide_taken }). */
	names(options) {
		return this.get('names', options);
	}

	/** DNS, email and registration health for a .com label. */
	domainHealth(name) {
		return this.get('domain-health', { name });
	}

	/** Strength report for a name (no price). deep=true runs the longer analysis. */
	appraise(name, deep = false) {
		return this.get('appraise', { name, deep: deep ? 'true' : undefined });
	}

	/** Username availability across social platforms. */
	handles(name) {
		return this.get('handles', { name });
	}

	/** ENS and Solana name availability. */
	web3(name) {
		return this.get('web3', { name });
	}

	/** Name screening: unwanted meanings in other languages. */
	screen(name) {
		return this.get('screen', { name });
	}

	/** Hosting provider ranking: { mode: 'top' | 'provider' | 'domain', q }. */
	hosting(options) {
		return this.get('hosting', options);
	}

	/** Daily size history for a keyword in the .com zone. */
	trend(keyword) {
		return this.get('trend', { keyword });
	}
}

export default NameDaemon;
