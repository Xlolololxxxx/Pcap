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
from urllib.parse import urlparse, parse_qs, urlencode
from collections import defaultdict
from pathlib import Path
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Global state
SESSION = {
    'folder': None,
    'pcap_pairs': [],
    'requests_by_pcap': {},
    'all_requests': defaultdict(list),
    'host_state': defaultdict(dict),  # host -> {headers: {}, cookies: {}}
}

# Expanded filter patterns for analytics/tracking
FILTER_PATTERNS = [
    # Analytics
    r'google-analytics\.com', r'googletagmanager\.com', r'gtag', r'analytics',
    r'mixpanel\.com', r'amplitude\.com', r'heap\.io', r'heapanalytics\.com',
    r'plausible\.io', r'matomo', r'piwik', r'chartbeat',

    # Metrics/Telemetry
    r'metrics', r'telemetry', r'measurement', r'/collect\?', r'/__trace',
    r'/v\d/t\?', r'rum\.', r'perf\.', r'performance-', r'stats\.',

    # Marketing/Advertising
    r'doubleclick\.net', r'facebook\.net.*tr', r'fbevents', r'fbq\(',
    r'googlesyndication', r'googleadservices', r'adsense', r'adservice',
    r'criteo\.', r'taboola\.', r'outbrain\.', r'amazon-adsystem',
    r'ads\.', r'adserver', r'advertising',

    # Tracking Pixels
    r'pixel', r'beacon', r'tracking', r'/tr\?', r'\.gif\?.*utm',
    r'impression', r'1x1\.', r'spacer\.gif', r'blank\.gif',

    # Session Recording/Heatmaps
    r'hotjar\.com', r'fullstory\.com', r'mouseflow', r'crazyegg',
    r'luckyorange', r'inspectlet', r'smartlook', r'clarity\.ms',

    # Error Tracking
    r'sentry\.io', r'bugsnag', r'rollbar', r'raygun', r'logrocket',
    r'trackjs\.com', r'errortracker',

    # Security/Bot Detection
    r'cloudflareinsights', r'datadome', r'recaptcha', r'captcha',
    r'hcaptcha', r'perimeterx', r'kasada', r'imperva',

    # A/B Testing
    r'optimizely\.com', r'vwo\.com', r'abtasty', r'convert\.com',

    # Customer Data Platforms
    r'segment\.io', r'segment\.com', r'mparticle', r'tealium',
    r'rudderstack', r'customerio', r'braze\.', r'iterable\.',

    # Push/Notifications
    r'onesignal\.com', r'pushwoosh', r'pusher\.com/notifications',

    # Social Widgets
    r'platform\.twitter', r'connect\.facebook', r'linkedin\.com/px',

    # Monitoring
    r'newrelic', r'appdynamics', r'dynatrace', r'datadog',
    r'pingdom', r'statuspage',

    # Common tracking endpoints
    r'/collect$', r'/event$', r'/log$', r'/track$', r'/ping$',
    r'nsure', r'optimove', r'\.optimove\.', r'mobileanalytics',

    # Fonts/CDN (usually not interesting)
    r'fonts\.googleapis', r'fonts\.gstatic', r'use\.typekit',
]


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
    combined = f"{host}{url}".lower()
    for pattern in FILTER_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return True
    return False


def normalize_url(url):
    """Normalize URL by sorting query parameters."""
    try:
        parsed = urlparse(url)
        if parsed.query:
            params = parse_qs(parsed.query, keep_blank_values=True)
            sorted_params = sorted(params.items())
            sorted_query = urlencode(sorted_params, doseq=True)
            return f"{parsed.scheme}://{parsed.netloc}{parsed.path}?{sorted_query}"
        return url
    except:
        return url


def get_request_signature(req):
    """Generate a signature for deduplication."""
    normalized_url = normalize_url(req.full_url)

    # Include body hash for POST/PUT/PATCH
    body_hash = ""
    if req.body and req.method in ['POST', 'PUT', 'PATCH']:
        body_hash = hashlib.md5(req.body.encode()).hexdigest()[:8]

    return f"{req.method}|{normalized_url}|{body_hash}"


def deduplicate_requests(requests_by_host):
    """Remove duplicates with improved logic."""
    deduped = defaultdict(list)
    for host, reqs in requests_by_host.items():
        seen = set()
        for req in reqs:
            sig = get_request_signature(req)
            if sig not in seen:
                seen.add(sig)
                deduped[host].append(req)
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
    """Parse single pcap file using tshark with -T fields for reliable extraction."""
    requests_by_host = defaultdict(list)

    # Use -T fields format which works reliably with large pcaps
    # Fields are tab-separated
    fields = [
        "http.request.method",
        "http.request.uri",
        "http.host",
        "http.request.full_uri",
        "http.user_agent",
        "http.cookie",
        "http.authorization",
        "http.content_type",
        "http.referer",
        "http.file_data",
        "http2.headers.method",
        "http2.headers.path",
        "http2.headers.authority",
        "http2.headers.scheme",
        "http2.headers.cookie",
        "http2.headers.authorization",
        "tcp.dstport",
    ]

    cmd = [
        "tshark", "-r", pcap_file,
        "-o", f"tls.keylog_file:{keylog_file}",
        "-Y", "http.request or http2.headers.method",
        "-T", "fields",
    ]
    for f in fields:
        cmd.extend(["-e", f])
    cmd.append("-E")
    cmd.append("separator=/t")  # Tab separator

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
    except subprocess.TimeoutExpired:
        print(f"[!] Timeout parsing {pcap_file}")
        return requests_by_host
    except Exception as e:
        print(f"[!] Parse error: {e}")
        return requests_by_host

    for line in lines:
        try:
            if not line.strip():
                continue
            parts = line.split('\t')
            if len(parts) < len(fields):
                parts.extend([''] * (len(fields) - len(parts)))

            req = HTTPRequest()
            req.pcap_source = os.path.basename(pcap_file)

            # Map fields by index
            http_method = parts[0]
            http_uri = parts[1]
            http_host = parts[2]
            http_full_uri = parts[3]
            http_ua = parts[4]
            http_cookie = parts[5]
            http_auth = parts[6]
            http_ct = parts[7]
            http_referer = parts[8]
            http_body = parts[9]
            h2_method = parts[10]
            h2_path = parts[11]
            h2_authority = parts[12]
            h2_scheme = parts[13]
            h2_cookie = parts[14]
            h2_auth = parts[15]
            tcp_port = parts[16] if len(parts) > 16 else "443"

            # HTTP/1.x
            if http_method:
                req.method = http_method
                req.uri = http_uri
                req.host = http_host
                req.full_url = http_full_uri
                if http_ua:
                    req.headers["User-Agent"] = http_ua
                if http_cookie:
                    req.headers["Cookie"] = http_cookie
                if http_auth:
                    req.headers["Authorization"] = http_auth
                if http_ct:
                    req.headers["Content-Type"] = http_ct
                if http_referer:
                    req.headers["Referer"] = http_referer
                if http_body:
                    req.body = http_body
            # HTTP/2
            elif h2_method:
                req.method = h2_method
                req.uri = h2_path
                req.host = h2_authority
                req.scheme = h2_scheme if h2_scheme else "https"
                if h2_cookie:
                    req.headers["Cookie"] = h2_cookie
                if h2_auth:
                    req.headers["Authorization"] = h2_auth

            if not req.method or not req.host:
                continue

            # Filter analytics
            if is_analytics_url(req.uri, req.host):
                continue

            req.port = int(tcp_port) if tcp_port else 443
            if req.port == 80:
                req.scheme = "http"

            if not req.full_url:
                p = "" if req.port in [80, 443] else f":{req.port}"
                req.full_url = f"{req.scheme}://{req.host}{p}{req.uri}"

            requests_by_host[req.host].append(req)
        except:
            continue

    return requests_by_host


# ============================================================
# ROUTES
# ============================================================

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/browse', methods=['POST'])
def browse():
    """Browse directories."""
    data = request.json
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
    data = request.json
    folder = data.get('folder')

    if not folder or not os.path.isdir(folder):
        return jsonify({'success': False, 'error': 'Invalid folder'})

    pairs = find_pcap_keylog_pairs(folder)
    SESSION['folder'] = folder
    SESSION['pcap_pairs'] = pairs

    return jsonify({
        'success': True,
        'folder': folder,
        'pairs': [{'pcap': os.path.basename(p), 'keylog': os.path.basename(k)} for p, k in pairs]
    })


@app.route('/api/parse', methods=['POST'])
def parse_all():
    """Parse all pcap files."""
    if not SESSION['pcap_pairs']:
        return jsonify({'success': False, 'error': 'No pcap files found'})

    SESSION['requests_by_pcap'] = {}
    SESSION['all_requests'] = defaultdict(list)

    total_requests = 0
    parsed_count = 0

    for pcap, keylog in SESSION['pcap_pairs']:
        requests_by_host = parse_pcap(pcap, keylog)
        SESSION['requests_by_pcap'][pcap] = requests_by_host

        for host, reqs in requests_by_host.items():
            SESSION['all_requests'][host].extend(reqs)
            total_requests += len(reqs)

        parsed_count += 1

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

    return jsonify({
        'success': True,
        'parsed': parsed_count,
        'total_requests': total_requests,
        'unique_requests': final_count,
        'hosts': len(SESSION['all_requests'])
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
        data = request.json
        if host not in SESSION['host_state']:
            SESSION['host_state'][host] = {'headers': {}, 'cookies': ''}
        SESSION['host_state'][host].update(data)
        return jsonify({'success': True})


@app.route('/api/curl', methods=['POST'])
def build_curl():
    """Build curl command for a request."""
    data = request.json

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
    data = request.json

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


if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("PCAPC Web App")
    print("=" * 50)
    print("Open in browser: http://localhost:5000")
    print("=" * 50 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
