export const VERSION: string;
export const DEFAULT_BASE_URL: string;

export interface NameDaemonOptions {
	baseUrl?: string;
	timeout?: number;
	retries?: number;
	fetch?: typeof fetch;
	userAgent?: string;
	/** A Pro+ or Business API key; defaults to the NAMEDAEMON_API_KEY environment variable. */
	apiKey?: string;
}

export class NameDaemonError extends Error {
	status: number;
	code: string;
	body: unknown;
	constructor(message: string, opts?: { status?: number; code?: string; body?: unknown });
}

export class RateLimitError extends NameDaemonError {
	retryAfter: number;
}

export type Json = Record<string, any>;

export interface RateResult extends Json {
	name: string;
	length: number;
	kind: 'word' | 'pair' | 'unknown';
	parts: string[];
	score: number | null;
	verdict: string | null;
	in_zone: boolean;
	breakdown: { label: string; points: number; max: number; note: string }[];
	tips: string[];
	alternatives: unknown[];
}

export interface IdeasResult extends Json {
	keyword: string;
	keyword_registered: boolean;
	ideas: { domain: string; score: number; w1: string; w2: string }[];
	data_as_of: string;
}

export interface CheckRow extends Json {
	domain: string;
	status: 'taken' | 'available' | 'dropping' | 'unverified' | 'unknown';
	in_zone: boolean;
	provider?: string;
	est_drop?: string;
	stage?: string;
}

export interface CheckResult extends Json {
	results: CheckRow[];
	data_as_of: string;
}

export class NameDaemon {
	constructor(options?: NameDaemonOptions);
	baseUrl: string;
	timeout: number;
	retries: number;
	get<T = Json>(path: string, params?: Record<string, unknown>): Promise<T>;
	post<T = Json>(path: string, json: unknown): Promise<T>;
	rate(name: string): Promise<RateResult>;
	ideas(q: string, limit?: number): Promise<IdeasResult>;
	verify(domains: string[]): Promise<Json>;
	check(domains: string[], verify?: number): Promise<CheckResult>;
	tldCheck(label: string, tlds: string[] | string): Promise<Json>;
	tco(tld?: string, options?: { years?: number; privacy?: boolean; q?: string; scope?: 'popular' | 'country' | 'all'; sort?: 'total' | 'hike' | 'alpha'; limit?: number }): Promise<Json>;
	hacks(options: { word?: string; keyword?: string; mode?: 'contains' | 'starts' | 'ends'; limit?: number }): Promise<Json>;
	names(options: { seeds: string[] | string; vibe?: string; min_len?: number; max_len?: number; count?: number; variation?: number; hide_taken?: boolean }): Promise<Json>;
	domainHealth(name: string): Promise<Json>;
	appraise(name: string, deep?: boolean): Promise<Json>;
	handles(name: string): Promise<Json>;
	web3(name: string): Promise<Json>;
	screen(name: string): Promise<Json>;
	hosting(options?: { mode?: 'top' | 'provider' | 'domain'; q?: string }): Promise<Json>;
	trend(keyword: string): Promise<Json>;
}

export default NameDaemon;
