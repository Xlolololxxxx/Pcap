#!/usr/bin/env python3
"""
PCAPC Web App - PCAP HTTP Request Replayer
Auto-matches keylogs to pcaps in a folder
"""

import os
import re
import json
import subprocess
import shlex
import hashlib
import pickle
import time
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs, urlencode
from collections import defaultdict
from pathlib import Path
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Cache directory
CACHE_DIR = Path.home() / '.pcapc_cache'
SESSION_CACHE = CACHE_DIR / 'session.pkl'
CACHE_MAX_AGE_DAYS = 7

# Global state
SESSION = {
    'folder': None,
    'pcap_pairs': [],
    'requests_by_pcap': {},
    'all_requests': defaultdict(list),
    'host_state': defaultdict(dict),  # host -> {headers: {}, cookies: {}}
}

# ============================================================
# COMPREHENSIVE ANALYTICS/JUNK URL FILTER SYSTEM
# ============================================================

# Host patterns - compiled once for efficiency
HOST_FILTER_PATTERNS = [
    # === ANALYTICS PLATFORMS ===
    # Google ecosystem
    r'google-analytics\.com',
    r'googletagmanager\.com',
    r'googleadservices\.com',
    r'googlesyndication\.com',
    r'doubleclick\.net',
    r'pagead\d*\.googlesyndication\.com',
    r'analytics\.google\.com',
    r'stats\.g\.doubleclick\.net',

    # Facebook/Meta
    r'facebook\.com/tr',
    r'facebook\.net/.*tr',
    r'connect\.facebook\.net',
    r'graph\.facebook\.com/.*/(activities|events)',
    r'pixel\.facebook\.com',

    # Twitter/X
    r'analytics\.twitter\.com',
    r't\.co/i/adsct',
    r'static\.ads-twitter\.com',

    # LinkedIn
    r'px\.ads\.linkedin\.com',
    r'snap\.licdn\.com',

    # TikTok
    r'analytics\.tiktok\.com',
    r'analytics-sg\.tiktok\.com',

    # Pinterest
    r'ct\.pinterest\.com',
    r'trk\.pinterest\.com',

    # Snapchat
    r'tr\.snapchat\.com',
    r'sc-static\.net/.*pixel',

    # Other major analytics
    r'mixpanel\.com',
    r'amplitude\.com',
    r'heap\.io',
    r'heapanalytics\.com',
    r'plausible\.io',
    r'matomo\.',
    r'piwik\.',
    r'chartbeat\.com',
    r'chartbeat\.net',

    # === CUSTOMER DATA PLATFORMS / MARKETING ===
    r'segment\.(io|com)',
    r'cdn\.segment\.com',
    r'mparticle\.com',
    r'rudderstack\.com',
    r'tealium(iq)?\.com',

    # Marketing automation
    r'braze\.(com|eu)',
    r'iterable\.com',
    r'klaviyo\.com',
    r'customer\.io',
    r'customeriomail\.com',

    # Marketing platforms
    r'hubspot\.com/.*track',
    r'marketo\.com',
    r'pardot\.com',
    r'mktoresp\.com',
    r'optimove\.(com|net)',
    r'insider\.in',
    r'useinsider\.com',
    r'clevertap\.com',

    # === SESSION RECORDING / HEATMAPS ===
    r'hotjar\.(com|io)',
    r'fullstory\.com',
    r'logrocket\.com',
    r'smartlook\.com',
    r'mouseflow\.com',
    r'crazyegg\.com',
    r'luckyorange\.com',
    r'inspectlet\.com',
    r'clarity\.ms',
    r'quantummetric\.com',

    # === ERROR TRACKING ===
    r'sentry\.io',
    r'o\d+\.ingest\.sentry\.io',
    r'bugsnag\.com',
    r'notify\.bugsnag\.com',
    r'rollbar\.com',
    r'api\.rollbar\.com',
    r'raygun\.io',
    r'raygun\.com',
    r'trackjs\.com',
    r'usage\.trackjs\.com',
    r'airbrake\.io',
    r'honeybadger\.io',

    # === PERFORMANCE / RUM / APM ===
    r'newrelic\.com',
    r'.*\.nr-data\.net',
    r'bam\.nr-data\.net',
    r'datadog(hq)?\.com',
    r'browser-intake-.*\.datadoghq\.com',
    r'dynatrace\.com',
    r'appdynamics\.com',
    r'speedcurve\.com',
    r'pingdom\.net',
    r'gtmetrix\.com',

    # === A/B TESTING / FEATURE FLAGS ===
    r'optimizely\.com',
    r'logx\.optimizely\.com',
    r'vwo\.com',
    r'dev\.visualwebsiteoptimizer\.com',
    r'abtasty\.com',
    r'try\.abtasty\.com',
    r'convert\.com',
    r'launchdarkly\.com',
    r'app\.launchdarkly\.com',
    r'split\.io',
    r'events\.split\.io',

    # === BOT DETECTION / SECURITY ===
    r'cloudflareinsights\.com',
    r'static\.cloudflareinsights\.com',
    r'datadome\.(co|com)',
    r'perimeterx\.net',
    r'client\.perimeterx\.net',
    r'kasada\.',
    r'imperva\.com',
    r'incapsula\.com',
    r'distil\.us',
    r'shapesecurity\.com',

    # Captcha services
    r'recaptcha\.net',
    r'google\.com/recaptcha',
    r'hcaptcha\.com',
    r'captcha-delivery\.com',

    # === ADVERTISING / AD TECH ===
    r'adsense\.com',
    r'adservice\.google',
    r'criteo\.(com|net)',
    r'taboola\.com',
    r'outbrain\.(com|org)',
    r'amazon-adsystem\.com',
    r'serving-sys\.com',
    r'adnxs\.com',
    r'adsrvr\.org',

    # === CDN / FONTS (usually noise) ===
    r'fonts\.googleapis\.com',
    r'fonts\.gstatic\.com',
    r'use\.typekit\.net',
    r'typekit\.com',
    r'cloud\.typography\.com',

    # === SOCIAL WIDGETS ===
    r'platform\.twitter\.com',
    r'connect\.facebook\.net',
    r'linkedin\.com/px',

    # === MONITORING / STATUS ===
    r'statuspage\.io',
    r'instatus\.com',

    # === PUSH NOTIFICATIONS ===
    r'onesignal\.com',
    r'pushwoosh\.com',
]

# Path patterns - ONLY match very specific analytics/tracking paths
# These should be specific enough to not match legitimate API endpoints
PATH_FILTER_PATTERNS = [
    # Google Analytics specific
    r'/__utm',
    r'/gtag/',
    r'/ga\.js$',
    r'/analytics\.js$',
    r'/gtm\.js$',

    # Facebook tracking
    r'/fbevents\.js',
    r'/fbq\.js',
    r'/tr\?id=\d+',  # Facebook pixel with ID

    # Generic tracking but ONLY at root or with clear tracking indicators
    r'^/collect\?.*v=\d',  # Google measurement protocol
    r'^/j/collect',        # Google specific
    r'/r/collect\?',       # Google specific

    # Pixel/beacon images (very specific)
    r'/\d+x\d+\.gif(\?|$)',
    r'/(spacer|blank|transparent)\.gif$',
    r'/pixel\.gif(\?|$)',
    r'\.gif\?.*utm_',

    # Session replay (specific patterns)
    r'/rec/[a-f0-9]{8,}',
    r'/session[_-]replay/',
]

# Whitelist - domains/paths that should NEVER be filtered
# (Use this to prevent false positives)
WHITELIST_PATTERNS = [
    # Add your actual API domains here if they match filter patterns
    # Example: r'api\.yourdomain\.com',
    # Example: r'myapp-metrics\.example\.com',  # Your own metrics API
]

# Compiled regex patterns (performance optimization)
_COMPILED_HOST_PATTERNS = None
_COMPILED_PATH_PATTERNS = None
_COMPILED_WHITELIST_PATTERNS = None

def _compile_filter_patterns():
    """Compile all regex patterns once on first use."""
    global _COMPILED_HOST_PATTERNS, _COMPILED_PATH_PATTERNS, _COMPILED_WHITELIST_PATTERNS

    if _COMPILED_HOST_PATTERNS is None:
        _COMPILED_HOST_PATTERNS = [re.compile(p, re.IGNORECASE) for p in HOST_FILTER_PATTERNS]
        _COMPILED_PATH_PATTERNS = [re.compile(p, re.IGNORECASE) for p in PATH_FILTER_PATTERNS]
        _COMPILED_WHITELIST_PATTERNS = [re.compile(p, re.IGNORECASE) for p in WHITELIST_PATTERNS]



class HTTPRequest:
    def __init__(self):
        self.method = ""
        self.uri = ""
        self.host = ""
        self.headers = {}
        self.body = ""
        self.full_url = ""
        self.scheme = "https"
        self.port = 443
        self.pcap_source = ""

    def to_dict(self):
        return {
            'method': self.method,
            'uri': self.uri,
            'host': self.host,
            'headers': self.headers,
            'body': self.body,
            'full_url': self.full_url,
            'scheme': self.scheme,
            'port': self.port,
            'pcap_source': self.pcap_source,
        }


def is_analytics_url(url, host):
    """
    Enhanced analytics/junk URL filter with whitelist support.

    Checks if a URL should be filtered based on:
    1. Whitelist (if matches, NEVER filter)
    2. Host patterns (analytics domains)
    3. Path patterns (tracking endpoints)

    Args:
        url: Request URI/path
        host: Request host

    Returns:
        True if URL should be filtered, False otherwise
    """
    # Compile patterns on first use
    _compile_filter_patterns()

    # Check whitelist first - never filter whitelisted domains/paths
    full_url = f"{host}{url}"
    for pattern in _COMPILED_WHITELIST_PATTERNS:
        if pattern.search(full_url):
            return False  # Don't filter whitelisted URLs

    # Check host patterns
    host_lower = host.lower()
    for pattern in _COMPILED_HOST_PATTERNS:
        if pattern.search(host_lower):
            return True

    # Check path patterns
    url_lower = url.lower()
    for pattern in _COMPILED_PATH_PATTERNS:
        if pattern.search(url_lower):
            return True

    return False



def normalize_url(url):
    """
    Normalize URL for better deduplication.
    - Handle URL encoding/decoding
    - Normalize path (remove trailing slashes, collapse //)
    - Sort and normalize query parameters
    - Remove fragment identifiers
    """
    try:
        from urllib.parse import unquote, quote

        parsed = urlparse(url)

        # Normalize scheme to lowercase
        scheme = parsed.scheme.lower() if parsed.scheme else 'https'

        # Normalize netloc (host:port) to lowercase
        netloc = parsed.netloc.lower() if parsed.netloc else ''

        # Normalize path
        path = parsed.path
        if path:
            # Decode and re-encode to normalize encoding
            path = quote(unquote(path), safe='/:@!$&\'()*+,;=')
            # Collapse multiple slashes
            path = re.sub(r'/+', '/', path)
            # Remove trailing slash (except for root)
            if len(path) > 1 and path.endswith('/'):
                path = path.rstrip('/')
        else:
            path = '/'

        # Normalize query parameters
        if parsed.query:
            # Parse query params
            params = parse_qs(parsed.query, keep_blank_values=True)
            # Sort params by key, then by value
            sorted_params = []
            for key in sorted(params.keys()):
                values = sorted(params[key])  # Sort values for each key
                for val in values:
                    sorted_params.append((key, val))
            # Rebuild query string
            sorted_query = urlencode(sorted_params, doseq=False)
            return f"{scheme}://{netloc}{path}?{sorted_query}"

        # No query params, no fragment
        return f"{scheme}://{netloc}{path}"

    except Exception as e:
        # Fallback to original URL if normalization fails
        return url


def normalize_body(body, content_type=''):
    """
    Normalize request body for deduplication.
    - Parse and re-serialize JSON to handle whitespace/ordering differences
    - Parse and sort URL-encoded form data
    - Hash binary data
    Returns normalized body string or hash.
    """
    if not body:
        return ''

    try:
        # Handle JSON bodies
        if 'application/json' in content_type.lower() or (body.strip().startswith('{') or body.strip().startswith('[')):
            try:
                parsed = json.loads(body)
                # Re-serialize with sorted keys and no whitespace
                return json.dumps(parsed, sort_keys=True, separators=(',', ':'))
            except json.JSONDecodeError:
                pass

        # Handle URL-encoded form data
        if 'application/x-www-form-urlencoded' in content_type.lower() or ('=' in body and '&' in body):
            try:
                # Parse and sort form data
                params = parse_qs(body, keep_blank_values=True)
                sorted_params = []
                for key in sorted(params.keys()):
                    values = sorted(params[key])
                    for val in values:
                        sorted_params.append((key, val))
                return urlencode(sorted_params, doseq=False)
            except:
                pass

        # For binary or unknown data, return hash
        # Detect if likely binary (contains many non-printable chars)
        non_printable = sum(1 for c in body[:100] if ord(c) < 32 and c not in '\n\r\t')
        if non_printable > 10:
            return hashlib.sha256(body.encode() if isinstance(body, str) else body).hexdigest()[:16]

        # Return as-is for other text data (normalize whitespace)
        return ' '.join(body.split())

    except Exception as e:
        # Fallback: return hash of body
        return hashlib.sha256(body.encode() if isinstance(body, str) else body).hexdigest()[:16]


def get_request_signature(req):
    """
    Generate a signature for deduplication.
    Considers:
    - Normalized URL (scheme://host:port/path?sorted_params)
    - Method
    - Body hash (for POST/PUT/PATCH) with normalized JSON/form data
    - Important header values (Content-Type, Authorization) but NOT changing values
    """
    normalized_url = normalize_url(req.full_url)

    # Get content type for body normalization
    content_type = req.headers.get('Content-Type', '')

    # Include normalized body hash for POST/PUT/PATCH
    body_hash = ""
    if req.body and req.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
        normalized_body_str = normalize_body(req.body, content_type)
        body_hash = hashlib.sha256(normalized_body_str.encode()).hexdigest()[:16]

    # Include important headers that distinguish requests
    # EXCLUDE headers that change every request: timestamps, nonces, request IDs, etc.
    important_headers = []

    # Content-Type matters (affects how body is interpreted)
    if content_type:
        # Normalize content type (remove charset, boundary params)
        ct_base = content_type.split(';')[0].strip().lower()
        important_headers.append(f"ct:{ct_base}")

    # Authorization matters IF it's not a dynamic token with timestamps
    # Include only if it looks stable (e.g., Basic auth, static Bearer)
    auth = req.headers.get('Authorization', '')
    if auth:
        # Check if it's Basic auth (stable) or a static-looking Bearer token
        if auth.startswith('Basic ') or (auth.startswith('Bearer ') and len(auth) < 100):
            important_headers.append(f"auth:{auth[:50]}")  # Truncate to avoid very long tokens

    # Build signature
    sig_parts = [
        req.method,
        normalized_url,
        body_hash,
        '|'.join(important_headers)
    ]

    return '|'.join(sig_parts)


def deduplicate_requests(requests_by_host):
    """
    Remove duplicates with improved logic.
    - Use improved signature with normalized URL and body
    - Keep the FIRST occurrence (earliest in capture)
    - Log how many duplicates were removed
    """
    deduped = defaultdict(list)
    total_before = 0
    total_after = 0

    for host, reqs in requests_by_host.items():
        seen = set()
        original_count = len(reqs)
        total_before += original_count

        for req in reqs:
            sig = get_request_signature(req)
            if sig not in seen:
                seen.add(sig)
                deduped[host].append(req)

        deduped_count = len(deduped[host])
        total_after += deduped_count

        duplicates_removed = original_count - deduped_count
        if duplicates_removed > 0:
            print(f"[+] {host}: removed {duplicates_removed} duplicate(s) ({original_count} -> {deduped_count})")

    total_duplicates = total_before - total_after
    if total_duplicates > 0:
        print(f"[+] Total duplicates removed: {total_duplicates} ({total_before} -> {total_after})")

    return deduped


def find_pcap_keylog_pairs(folder):
    """Auto-match pcap files with their corresponding keylog files."""
    folder = Path(folder)
    pairs = []

    pcap_files = list(folder.glob("*.pcap")) + list(folder.glob("*.pcapng")) + list(folder.glob("*.cap"))
    keylog_files = list(set(
        list(folder.glob("*.log")) +
        list(folder.glob("*.txt")) +
        list(folder.glob("*.keys")) +
        list(folder.glob("*.pms")) +
        list(folder.glob("*sslkey*")) +
        list(folder.glob("*keylog*"))
    ))

    for pcap in pcap_files:
        pcap_stem = pcap.stem.lower()
        pcap_mtime = pcap.stat().st_mtime
        best_match = None
        best_score = 0

        for keylog in keylog_files:
            score = 0
            keylog_stem = keylog.stem.lower()

            if pcap_stem == keylog_stem:
                score += 100
            elif pcap_stem in keylog_stem or keylog_stem in pcap_stem:
                score += 50

            if 'sslkey' in keylog_stem or 'keylog' in keylog_stem or 'keys' in keylog_stem:
                score += 20

            pcap_nums = re.findall(r'\d+', pcap_stem)
            keylog_nums = re.findall(r'\d+', keylog_stem)
            if pcap_nums and keylog_nums:
                for pn in pcap_nums:
                    if pn in keylog_nums:
                        score += 30

            keylog_mtime = keylog.stat().st_mtime
            time_diff = abs(pcap_mtime - keylog_mtime)
            if time_diff < 3600:
                score += 25
            elif time_diff < 86400:
                score += 10

            if score > best_score:
                best_score = score
                best_match = keylog

        if best_match and best_score >= 20:
            pairs.append((str(pcap), str(best_match)))
        elif keylog_files:
            pairs.append((str(pcap), str(keylog_files[0])))

    return pairs


def parse_pcap(pcap_file, keylog_file):
    """Parse single pcap file using tshark with comprehensive field extraction.

    Extracts:
    - Request parameters (query strings, form data)
    - All cookies (both HTTP/1.x and HTTP/2)
    - Message bodies (POST data, JSON payloads, multipart)
    - All headers (standard + custom X-* headers)
    - HTTP/2 custom headers via http2.header.name/value pairs
    """
    requests_by_host = defaultdict(list)

    # Comprehensive field list for maximum data extraction
    cmd = [
        "tshark", "-r", pcap_file,
        "-o", f"tls.keylog_file:{keylog_file}",
        "-Y", "http.request or http2.headers.method",
        "-T", "json",
        # HTTP/1.x Request Line & URI Components
        "-e", "http.request.method",
        "-e", "http.request.uri",
        "-e", "http.request.uri.path",
        "-e", "http.request.uri.query",
        "-e", "http.host",
        "-e", "http.request.full_uri",
        # HTTP/1.x Standard Headers
        "-e", "http.user_agent",
        "-e", "http.accept",
        "-e", "http.accept_language",
        "-e", "http.accept_encoding",
        "-e", "http.content_type",
        "-e", "http.content_length",
        "-e", "http.authorization",
        "-e", "http.cookie",
        "-e", "http.cookie_pair",
        "-e", "http.referer",
        "-e", "http.origin",
        "-e", "http.connection",
        "-e", "http.cache_control",
        "-e", "http.upgrade",
        "-e", "http.sec_websocket_key",
        "-e", "http.sec_websocket_version",
        "-e", "http.sec_fetch_site",
        "-e", "http.sec_fetch_mode",
        "-e", "http.sec_fetch_dest",
        "-e", "http.sec_ch_ua",
        "-e", "http.sec_ch_ua_mobile",
        "-e", "http.sec_ch_ua_platform",
        "-e", "http.x_requested_with",
        "-e", "http.x_forwarded_for",
        "-e", "http.x_real_ip",
        "-e", "http.x_csrf_token",
        "-e", "http.x_csrftoken",
        "-e", "http.x_xsrf_token",
        # HTTP/1.x All Request Lines (for custom headers)
        "-e", "http.request.line",
        # HTTP/1.x Body Fields
        "-e", "http.file_data",
        "-e", "urlencoded-form.key",
        "-e", "urlencoded-form.value",
        "-e", "json.value.string",
        "-e", "json.key",
        "-e", "mime_multipart.header.content-disposition",
        "-e", "mime_multipart.part",
        "-e", "data.data",
        "-e", "data.len",
        # HTTP/2 Headers
        "-e", "http2.headers.method",
        "-e", "http2.headers.path",
        "-e", "http2.headers.authority",
        "-e", "http2.headers.scheme",
        "-e", "http2.headers.cookie",
        "-e", "http2.headers.authorization",
        "-e", "http2.headers.user-agent",
        "-e", "http2.headers.content-type",
        "-e", "http2.headers.content-length",
        "-e", "http2.headers.accept",
        "-e", "http2.headers.accept-language",
        "-e", "http2.headers.accept-encoding",
        "-e", "http2.headers.referer",
        "-e", "http2.headers.origin",
        "-e", "http2.headers.sec-fetch-site",
        "-e", "http2.headers.sec-fetch-mode",
        "-e", "http2.headers.sec-fetch-dest",
        "-e", "http2.header.name",
        "-e", "http2.header.value",
        # Network Info
        "-e", "tcp.dstport",
        "-e", "tcp.srcport",
        "-e", "ip.dst",
        "-e", "ip.src",
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        packets = json.loads(result.stdout) if result.stdout.strip() else []
    except Exception as e:
        print(f"[!] Parse error: {e}")
        return requests_by_host

    for pkt in packets:
        try:
            layers = pkt.get("_source", {}).get("layers", {})
            req = HTTPRequest()
            req.pcap_source = os.path.basename(pcap_file)

            # HTTP/1.x
            method = layers.get("http.request.method", [""])[0]
            if method:
                req.method = method
                req.uri = layers.get("http.request.uri", [""])[0]
                req.host = layers.get("http.host", [""])[0]
                req.full_url = layers.get("http.request.full_uri", [""])[0]

                # Standard headers with extended fields
                header_map = {
                    "http.user_agent": "User-Agent",
                    "http.accept": "Accept",
                    "http.accept_language": "Accept-Language",
                    "http.accept_encoding": "Accept-Encoding",
                    "http.content_type": "Content-Type",
                    "http.content_length": "Content-Length",
                    "http.authorization": "Authorization",
                    "http.cookie": "Cookie",
                    "http.referer": "Referer",
                    "http.origin": "Origin",
                    "http.connection": "Connection",
                    "http.cache_control": "Cache-Control",
                    "http.upgrade": "Upgrade",
                    "http.sec_websocket_key": "Sec-WebSocket-Key",
                    "http.sec_websocket_version": "Sec-WebSocket-Version",
                    "http.sec_fetch_site": "Sec-Fetch-Site",
                    "http.sec_fetch_mode": "Sec-Fetch-Mode",
                    "http.sec_fetch_dest": "Sec-Fetch-Dest",
                    "http.sec_ch_ua": "Sec-CH-UA",
                    "http.sec_ch_ua_mobile": "Sec-CH-UA-Mobile",
                    "http.sec_ch_ua_platform": "Sec-CH-UA-Platform",
                    "http.x_requested_with": "X-Requested-With",
                    "http.x_forwarded_for": "X-Forwarded-For",
                    "http.x_real_ip": "X-Real-IP",
                    "http.x_csrf_token": "X-CSRF-Token",
                    "http.x_csrftoken": "X-CSRFToken",
                    "http.x_xsrf_token": "X-XSRF-TOKEN",
                }
                for field, header in header_map.items():
                    if layers.get(field):
                        value = layers[field][0] if isinstance(layers[field], list) else layers[field]
                        if value:
                            req.headers[header] = value

                # Parse ALL headers from request lines (includes custom X-* headers)
                for line in layers.get("http.request.line", []):
                    if ": " in line:
                        k, v = line.split(": ", 1)
                        k, v = k.strip(), v.strip().rstrip("\\r\\n")
                        if k and v:
                            # Don't overwrite existing headers, but add new ones
                            if k not in req.headers:
                                req.headers[k] = v

                # Enhanced body extraction
                body_found = False

                # 1. Try http.file_data first (most complete)
                if layers.get("http.file_data"):
                    req.body = layers["http.file_data"][0]
                    body_found = True

                # 2. Try URL-encoded form data
                if not body_found and layers.get("urlencoded-form.key"):
                    keys = layers.get("urlencoded-form.key", [])
                    values = layers.get("urlencoded-form.value", [])
                    if isinstance(keys, list) and isinstance(values, list):
                        form_pairs = []
                        for i in range(len(keys)):
                            key = keys[i] if i < len(keys) else ""
                            value = values[i] if i < len(values) else ""
                            if key:
                                form_pairs.append(f"{key}={value}")
                        if form_pairs:
                            req.body = "&".join(form_pairs)
                            body_found = True

                # 3. Try JSON data reconstruction
                if not body_found and (layers.get("json.key") or layers.get("json.value.string")):
                    json_keys = layers.get("json.key", [])
                    json_values = layers.get("json.value.string", [])
                    if json_keys and json_values:
                        try:
                            json_obj = {}
                            if isinstance(json_keys, list) and isinstance(json_values, list):
                                for i in range(min(len(json_keys), len(json_values))):
                                    json_obj[json_keys[i]] = json_values[i]
                            if json_obj:
                                req.body = json.dumps(json_obj)
                                body_found = True
                        except:
                            pass

                # 4. Try multipart form data
                if not body_found and layers.get("mime_multipart.part"):
                    parts = layers.get("mime_multipart.part", [])
                    if parts:
                        req.body = f"[Multipart data with {len(parts) if isinstance(parts, list) else 1} part(s)]"
                        body_found = True

                # 5. Fall back to raw hex data
                if not body_found and layers.get("data.data"):
                    try:
                        hex_data = layers["data.data"][0]
                        # Remove colons if present
                        hex_data = hex_data.replace(":", "")
                        # Try to decode as UTF-8
                        decoded = bytes.fromhex(hex_data).decode('utf-8', errors='replace')
                        # Only use if it looks like readable data
                        if decoded.strip():
                            req.body = decoded
                    except:
                        pass

            # HTTP/2
            else:
                method = layers.get("http2.headers.method", [""])[0]
                if method:
                    req.method = method
                    req.uri = layers.get("http2.headers.path", [""])[0]
                    req.host = layers.get("http2.headers.authority", [""])[0]
                    req.scheme = layers.get("http2.headers.scheme", ["https"])[0]

                    # HTTP/2 Standard Headers
                    h2_header_map = {
                        "http2.headers.cookie": "Cookie",
                        "http2.headers.authorization": "Authorization",
                        "http2.headers.user-agent": "User-Agent",
                        "http2.headers.content-type": "Content-Type",
                        "http2.headers.content-length": "Content-Length",
                        "http2.headers.accept": "Accept",
                        "http2.headers.accept-language": "Accept-Language",
                        "http2.headers.accept-encoding": "Accept-Encoding",
                        "http2.headers.referer": "Referer",
                        "http2.headers.origin": "Origin",
                        "http2.headers.sec-fetch-site": "Sec-Fetch-Site",
                        "http2.headers.sec-fetch-mode": "Sec-Fetch-Mode",
                        "http2.headers.sec-fetch-dest": "Sec-Fetch-Dest",
                    }
                    for field, header in h2_header_map.items():
                        if layers.get(field):
                            value = layers[field][0] if isinstance(layers[field], list) else layers[field]
                            if value:
                                req.headers[header] = value

                    # Parse ALL HTTP/2 headers (including custom ones)
                    h2_names = layers.get("http2.header.name", [])
                    h2_values = layers.get("http2.header.value", [])
                    if isinstance(h2_names, list) and isinstance(h2_values, list):
                        for i in range(len(h2_names)):
                            name = h2_names[i] if i < len(h2_names) else ""
                            value = h2_values[i] if i < len(h2_values) else ""
                            if name and value:
                                # Convert to standard header format
                                header_name = "-".join(word.capitalize() for word in name.split("-"))
                                if header_name not in req.headers and not name.startswith(":"):
                                    req.headers[header_name] = value

            if not req.method or not req.host:
                continue

            # Filter analytics
            if is_analytics_url(req.uri, req.host):
                continue

            port = layers.get("tcp.dstport", ["443"])[0]
            req.port = int(port) if port else 443
            if req.port == 80:
                req.scheme = "http"

            if not req.full_url:
                p = "" if req.port in [80, 443] else f":{req.port}"
                req.full_url = f"{req.scheme}://{req.host}{p}{req.uri}"

            requests_by_host[req.host].append(req)
        except Exception as ex:
            # Silently skip malformed packets
            # Optionally log: print(f"[!] Packet parse error: {ex}")
            continue

    return requests_by_host


# ============================================================
# CACHE MANAGEMENT
# ============================================================

def ensure_cache_dir():
    """Create cache directory if it doesn't exist."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def get_folder_hash(folder_path):
    """Generate a hash for a folder path."""
    return hashlib.md5(folder_path.encode()).hexdigest()[:12]


def get_cache_path(folder_path):
    """Get cache file path for a folder."""
    folder_hash = get_folder_hash(folder_path)
    return CACHE_DIR / f"{folder_hash}.pkl"


def get_pcap_mtimes(folder_path, pcap_pairs):
    """Get modification times for all pcap files."""
    mtimes = {}
    for pcap_path, keylog_path in pcap_pairs:
        try:
            pcap_mtime = os.path.getmtime(pcap_path)
            keylog_mtime = os.path.getmtime(keylog_path)
            mtimes[pcap_path] = max(pcap_mtime, keylog_mtime)
        except:
            mtimes[pcap_path] = 0
    return mtimes


def is_cache_valid(cache_path, folder_path, pcap_pairs):
    """Check if cache is still valid."""
    if not cache_path.exists():
        return False

    try:
        # Check cache age
        cache_age = time.time() - cache_path.stat().st_mtime
        if cache_age > (CACHE_MAX_AGE_DAYS * 86400):
            return False

        # Load cache metadata
        with open(cache_path, 'rb') as f:
            cache_data = pickle.load(f)

        cached_mtimes = cache_data.get('mtimes', {})
        current_mtimes = get_pcap_mtimes(folder_path, pcap_pairs)

        # Check if any files changed
        for pcap, mtime in current_mtimes.items():
            if pcap not in cached_mtimes or cached_mtimes[pcap] < mtime:
                return False

        return True
    except:
        return False


def save_cache(folder_path, pcap_pairs, requests_by_pcap):
    """Save parsed data to cache."""
    ensure_cache_dir()
    cache_path = get_cache_path(folder_path)

    try:
        # Convert HTTPRequest objects to dicts for serialization
        serializable_data = {}
        for pcap, requests_by_host in requests_by_pcap.items():
            serializable_data[pcap] = {}
            for host, reqs in requests_by_host.items():
                serializable_data[pcap][host] = [req.to_dict() for req in reqs]

        cache_data = {
            'folder': folder_path,
            'pcap_pairs': pcap_pairs,
            'requests_by_pcap': serializable_data,
            'mtimes': get_pcap_mtimes(folder_path, pcap_pairs),
            'timestamp': time.time(),
        }

        with open(cache_path, 'wb') as f:
            pickle.dump(cache_data, f)

        return True
    except Exception as e:
        print(f"[!] Cache save error: {e}")
        return False


def load_cache(folder_path, pcap_pairs):
    """Load parsed data from cache."""
    cache_path = get_cache_path(folder_path)

    if not is_cache_valid(cache_path, folder_path, pcap_pairs):
        return None

    try:
        with open(cache_path, 'rb') as f:
            cache_data = pickle.load(f)

        # Convert dicts back to HTTPRequest objects
        requests_by_pcap = {}
        for pcap, requests_by_host in cache_data['requests_by_pcap'].items():
            requests_by_pcap[pcap] = defaultdict(list)
            for host, reqs in requests_by_host.items():
                for req_dict in reqs:
                    req = HTTPRequest()
                    req.method = req_dict['method']
                    req.uri = req_dict['uri']
                    req.host = req_dict['host']
                    req.headers = req_dict['headers']
                    req.body = req_dict['body']
                    req.full_url = req_dict['full_url']
                    req.scheme = req_dict['scheme']
                    req.port = req_dict['port']
                    req.pcap_source = req_dict['pcap_source']
                    requests_by_pcap[pcap][host].append(req)

        return requests_by_pcap
    except Exception as e:
        print(f"[!] Cache load error: {e}")
        return None


def save_session():
    """Save current session state."""
    ensure_cache_dir()

    try:
        # Convert HTTPRequest objects to dicts
        serializable_all_requests = {}
        for host, reqs in SESSION['all_requests'].items():
            serializable_all_requests[host] = [req.to_dict() for req in reqs]

        session_data = {
            'folder': SESSION['folder'],
            'pcap_pairs': SESSION['pcap_pairs'],
            'all_requests': serializable_all_requests,
            'host_state': dict(SESSION['host_state']),
            'timestamp': time.time(),
        }

        with open(SESSION_CACHE, 'wb') as f:
            pickle.dump(session_data, f)

        return True
    except Exception as e:
        print(f"[!] Session save error: {e}")
        return False


def load_session():
    """Load previous session state."""
    if not SESSION_CACHE.exists():
        return False

    try:
        # Check session age
        session_age = time.time() - SESSION_CACHE.stat().st_mtime
        if session_age > (CACHE_MAX_AGE_DAYS * 86400):
            return False

        with open(SESSION_CACHE, 'rb') as f:
            session_data = pickle.load(f)

        SESSION['folder'] = session_data['folder']
        SESSION['pcap_pairs'] = session_data['pcap_pairs']
        SESSION['host_state'] = defaultdict(dict, session_data['host_state'])

        # Convert dicts back to HTTPRequest objects
        SESSION['all_requests'] = defaultdict(list)
        for host, reqs in session_data['all_requests'].items():
            for req_dict in reqs:
                req = HTTPRequest()
                req.method = req_dict['method']
                req.uri = req_dict['uri']
                req.host = req_dict['host']
                req.headers = req_dict['headers']
                req.body = req_dict['body']
                req.full_url = req_dict['full_url']
                req.scheme = req_dict['scheme']
                req.port = req_dict['port']
                req.pcap_source = req_dict['pcap_source']
                SESSION['all_requests'][host].append(req)

        return True
    except Exception as e:
        print(f"[!] Session load error: {e}")
        return False


def cleanup_old_caches():
    """Remove cache files older than CACHE_MAX_AGE_DAYS."""
    if not CACHE_DIR.exists():
        return 0

    removed = 0
    cutoff_time = time.time() - (CACHE_MAX_AGE_DAYS * 86400)

    try:
        for cache_file in CACHE_DIR.glob('*.pkl'):
            try:
                if cache_file.stat().st_mtime < cutoff_time:
                    cache_file.unlink()
                    removed += 1
            except:
                pass
    except:
        pass

    return removed


# ============================================================
# ROUTES
# ============================================================

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/browse', methods=['POST'])
def browse():
    """Browse directories."""
    data = request.get_json(silent=True) or {}
    path = data.get('path', os.path.expanduser('~'))

    try:
        path = os.path.abspath(os.path.expanduser(path))
        entries = []

        if path != '/':
            entries.append({'name': '..', 'type': 'dir', 'path': os.path.dirname(path)})

        for entry in sorted(os.listdir(path)):
            if entry.startswith('.'):
                continue
            full = os.path.join(path, entry)
            if os.path.isdir(full):
                entries.append({'name': entry, 'type': 'dir', 'path': full})

        return jsonify({'success': True, 'path': path, 'entries': entries})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/scan', methods=['POST'])
def scan_folder():
    """Scan folder for pcap/keylog pairs."""
    data = request.get_json(silent=True) or {}
    folder = data.get('folder')

    if not folder or not os.path.isdir(folder):
        return jsonify({'success': False, 'error': 'Invalid folder'})

    pairs = find_pcap_keylog_pairs(folder)
    SESSION['folder'] = folder
    SESSION['pcap_pairs'] = pairs

    # Check if cache exists for this folder
    cache_path = get_cache_path(folder)
    has_cache = cache_path.exists() and is_cache_valid(cache_path, folder, pairs)

    return jsonify({
        'success': True,
        'folder': folder,
        'pairs': [{'pcap': os.path.basename(p), 'keylog': os.path.basename(k)} for p, k in pairs],
        'has_cache': has_cache
    })


@app.route('/api/parse', methods=['POST'])
def parse_all():
    """Parse all pcap files with caching support."""
    if not SESSION['pcap_pairs']:
        return jsonify({'success': False, 'error': 'No pcap files found'})

    data = request.get_json(silent=True) or {}
    force_reparse = data.get('force', False)

    folder = SESSION['folder']
    pcap_pairs = SESSION['pcap_pairs']

    # Try to load from cache first (unless force reparse)
    cached_data = None
    used_cache = False
    if not force_reparse:
        cached_data = load_cache(folder, pcap_pairs)
        if cached_data:
            SESSION['requests_by_pcap'] = cached_data
            used_cache = True

    # Parse if no cache or force reparse
    if not cached_data:
        SESSION['requests_by_pcap'] = {}

        total_requests = 0
        parsed_count = 0

        for pcap, keylog in pcap_pairs:
            requests_by_host = parse_pcap(pcap, keylog)
            SESSION['requests_by_pcap'][pcap] = requests_by_host

            for host, reqs in requests_by_host.items():
                total_requests += len(reqs)

            parsed_count += 1

        # Save to cache
        save_cache(folder, pcap_pairs, SESSION['requests_by_pcap'])

    # Merge all requests from all pcaps
    SESSION['all_requests'] = defaultdict(list)
    total_requests = 0
    for pcap, requests_by_host in SESSION['requests_by_pcap'].items():
        for host, reqs in requests_by_host.items():
            SESSION['all_requests'][host].extend(reqs)
            total_requests += len(reqs)

    # Deduplicate merged requests
    SESSION['all_requests'] = deduplicate_requests(SESSION['all_requests'])
    final_count = sum(len(r) for r in SESSION['all_requests'].values())

    # Auto-extract auth state per host
    for host, reqs in SESSION['all_requests'].items():
        if host not in SESSION['host_state']:
            SESSION['host_state'][host] = {'headers': {}, 'cookies': ''}
        for req in reqs:
            if 'Authorization' in req.headers and not SESSION['host_state'][host]['headers'].get('Authorization'):
                SESSION['host_state'][host]['headers']['Authorization'] = req.headers['Authorization']
            if 'Cookie' in req.headers and not SESSION['host_state'][host]['cookies']:
                SESSION['host_state'][host]['cookies'] = req.headers['Cookie']

    # Save session state
    save_session()

    return jsonify({
        'success': True,
        'parsed': len(pcap_pairs),
        'total_requests': total_requests,
        'unique_requests': final_count,
        'hosts': len(SESSION['all_requests']),
        'from_cache': used_cache
    })


@app.route('/api/hosts', methods=['GET'])
def get_hosts():
    """Get list of hosts."""
    hosts = []
    for host, reqs in sorted(SESSION['all_requests'].items()):
        hosts.append({
            'host': host,
            'count': len(reqs),
            'has_auth': any('Authorization' in r.headers for r in reqs),
            'has_cookie': any('Cookie' in r.headers for r in reqs),
        })
    return jsonify({'success': True, 'hosts': hosts})


@app.route('/api/requests/<path:host>', methods=['GET'])
def get_requests(host):
    """Get requests for a host."""
    if host not in SESSION['all_requests']:
        return jsonify({'success': False, 'error': 'Host not found'})

    reqs = [r.to_dict() for r in SESSION['all_requests'][host]]
    return jsonify({'success': True, 'requests': reqs})


@app.route('/api/host_state/<path:host>', methods=['GET', 'POST'])
def host_state(host):
    """Get or update saved state for a host."""
    if request.method == 'GET':
        return jsonify({'success': True, 'state': SESSION['host_state'].get(host, {})})
    else:
        data = request.get_json(silent=True) or {}
        if host not in SESSION['host_state']:
            SESSION['host_state'][host] = {'headers': {}, 'cookies': ''}
        SESSION['host_state'][host].update(data)
        return jsonify({'success': True})


@app.route('/api/curl', methods=['POST'])
def build_curl():
    """Build curl command for a request."""
    data = request.get_json(silent=True) or {}

    # Don't use -vv, just -k for insecure
    cmd = ["curl", "-k", "-X", data.get('method', 'GET')]

    for h, v in data.get('headers', {}).items():
        if h and v and h not in ['Host', 'Content-Length', 'Transfer-Encoding']:
            cmd.extend(["-H", f"{h}: {v}"])

    body = data.get('body', '')
    if body:
        cmd.extend(["-d", body])

    cmd.append(data.get('full_url', data.get('url', '')))

    return jsonify({
        'success': True,
        'curl': " ".join(shlex.quote(c) for c in cmd)
    })


@app.route('/api/execute', methods=['POST'])
def execute_curl():
    """Execute curl command and return structured response."""
    data = request.get_json(silent=True) or {}

    # Build request from data
    method = data.get('method', 'GET')
    url = data.get('url', '')
    headers = data.get('headers', {})
    body = data.get('body', '')

    # Build curl command parts
    cmd = ["curl", "-s", "-i", "-k", "-X", method]

    for h, v in headers.items():
        if h and v and h not in ['Host', 'Content-Length', 'Transfer-Encoding']:
            cmd.extend(["-H", f"{h}: {v}"])

    if body:
        cmd.extend(["-d", body])

    cmd.append(url)

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )

        output = result.stdout
        stderr = result.stderr

        status_code = "?"
        resp_headers = {}
        resp_body = ""

        if output:
            # Try different separators
            for sep in ['\r\n\r\n', '\n\n']:
                if sep in output:
                    parts = output.split(sep, 1)
                    header_section = parts[0]
                    resp_body = parts[1] if len(parts) > 1 else ""

                    # Parse headers
                    lines = header_section.replace('\r\n', '\n').split('\n')
                    for line in lines:
                        if line.startswith('HTTP/'):
                            match = re.search(r'HTTP/[\d.]+\s+(\d+)', line)
                            if match:
                                status_code = match.group(1)
                        elif ': ' in line:
                            k, v = line.split(': ', 1)
                            resp_headers[k.strip()] = v.strip()
                    break
            else:
                # No separator found, might be all body or error
                resp_body = output

        return jsonify({
            'success': True,
            'status_code': status_code,
            'headers': resp_headers,
            'body': resp_body.strip()
        })

    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Request timed out (30s)'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/session', methods=['GET'])
def get_session_state():
    """Get current session state."""
    has_data = bool(SESSION['all_requests'])

    session_info = {
        'success': True,
        'has_data': has_data,
        'folder': SESSION['folder'],
        'host_count': len(SESSION['all_requests']),
        'total_requests': sum(len(reqs) for reqs in SESSION['all_requests'].values()),
        'pcap_count': len(SESSION['pcap_pairs']),
    }

    if has_data:
        # Add summary stats
        hosts_with_auth = sum(1 for reqs in SESSION['all_requests'].values()
                              if any('Authorization' in r.headers for r in reqs))
        hosts_with_cookies = sum(1 for reqs in SESSION['all_requests'].values()
                                 if any('Cookie' in r.headers for r in reqs))

        session_info.update({
            'hosts_with_auth': hosts_with_auth,
            'hosts_with_cookies': hosts_with_cookies,
        })

    return jsonify(session_info)


@app.route('/api/cache_status', methods=['GET'])
def get_cache_status():
    """Get cache status and information."""
    if not CACHE_DIR.exists():
        return jsonify({
            'success': True,
            'cache_dir': str(CACHE_DIR),
            'exists': False,
            'cached_folders': [],
            'total_size': 0,
        })

    cached_folders = []
    total_size = 0

    try:
        for cache_file in CACHE_DIR.glob('*.pkl'):
            try:
                file_size = cache_file.stat().st_size
                file_mtime = cache_file.stat().st_mtime
                total_size += file_size

                # Try to read cache metadata
                with open(cache_file, 'rb') as f:
                    cache_data = pickle.load(f)

                folder_info = {
                    'cache_file': cache_file.name,
                    'folder': cache_data.get('folder', 'unknown'),
                    'size': file_size,
                    'age_hours': (time.time() - file_mtime) / 3600,
                    'timestamp': datetime.fromtimestamp(file_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                    'pcap_count': len(cache_data.get('pcap_pairs', [])),
                }

                # Check if this is the session cache
                if cache_file == SESSION_CACHE:
                    folder_info['is_session'] = True

                cached_folders.append(folder_info)
            except:
                pass

    except:
        pass

    return jsonify({
        'success': True,
        'cache_dir': str(CACHE_DIR),
        'exists': True,
        'cached_folders': cached_folders,
        'total_size': total_size,
        'max_age_days': CACHE_MAX_AGE_DAYS,
    })


@app.route('/api/clear_cache', methods=['POST'])
def clear_cache():
    """Clear all cached data."""
    data = request.get_json(silent=True) or {}
    clear_type = data.get('type', 'all')  # 'all', 'session', 'folder'

    removed_files = 0
    removed_size = 0

    try:
        if clear_type == 'all':
            # Remove all cache files
            if CACHE_DIR.exists():
                for cache_file in CACHE_DIR.glob('*.pkl'):
                    try:
                        size = cache_file.stat().st_size
                        cache_file.unlink()
                        removed_files += 1
                        removed_size += size
                    except:
                        pass

            # Clear in-memory session
            SESSION['folder'] = None
            SESSION['pcap_pairs'] = []
            SESSION['requests_by_pcap'] = {}
            SESSION['all_requests'] = defaultdict(list)
            SESSION['host_state'] = defaultdict(dict)

        elif clear_type == 'session':
            # Remove session cache only
            if SESSION_CACHE.exists():
                size = SESSION_CACHE.stat().st_size
                SESSION_CACHE.unlink()
                removed_files = 1
                removed_size = size

        elif clear_type == 'folder':
            # Remove cache for current folder only
            if SESSION['folder']:
                cache_path = get_cache_path(SESSION['folder'])
                if cache_path.exists():
                    size = cache_path.stat().st_size
                    cache_path.unlink()
                    removed_files = 1
                    removed_size = size

        elif clear_type == 'old':
            # Remove old cache files
            removed_files = cleanup_old_caches()

        return jsonify({
            'success': True,
            'removed_files': removed_files,
            'removed_size': removed_size,
            'type': clear_type,
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/restore_session', methods=['POST'])
def restore_session():
    """Restore previous session from cache."""
    success = load_session()

    if not success:
        return jsonify({
            'success': False,
            'error': 'No valid session found or session expired'
        })

    # Return restored session info
    return jsonify({
        'success': True,
        'folder': SESSION['folder'],
        'host_count': len(SESSION['all_requests']),
        'total_requests': sum(len(reqs) for reqs in SESSION['all_requests'].values()),
        'pcap_count': len(SESSION['pcap_pairs']),
    })


if __name__ == '__main__':
    # Initialize on startup
    ensure_cache_dir()

    # Try to load previous session
    session_loaded = load_session()
    if session_loaded:
        print("[*] Restored previous session")
        print(f"    Folder: {SESSION['folder']}")
        print(f"    Hosts: {len(SESSION['all_requests'])}")
        print(f"    Requests: {sum(len(reqs) for reqs in SESSION['all_requests'].values())}")

    # Cleanup old caches
    removed = cleanup_old_caches()
    if removed > 0:
        print(f"[*] Cleaned up {removed} old cache file(s)")

    print("\n" + "=" * 50)
    print("PCAPC Web App")
    print("=" * 50)
    print("Open in browser: http://localhost:5000")
    if session_loaded:
        print("Previous session restored - ready to use!")
    print("=" * 50 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
