from dataclasses import dataclass, field
from typing import Dict, List, Optional

@dataclass
class Response:
    statusCode: int
    headers: Dict[str, str]
    body: str

@dataclass
class NetworkRequest:
    id: str
    timestamp: int
    method: str
    host: str
    ip: str
    port: int
    path: str
    protocol: str
    headers: Dict[str, str]
    body: str
    response: Optional[Response] = None

@dataclass
class HostSession:
    host: str
    headers: Dict[str, str] = field(default_factory=dict)
    cookies: Dict[str, str] = field(default_factory=dict)
    authTokens: List[str] = field(default_factory=list)
    lastUpdated: int = 0

@dataclass
class FilterConfig:
    ipAddresses: List[str] = field(default_factory=list)
    hostnames: List[str] = field(default_factory=list)
    protocols: List[str] = field(default_factory=list)
    endpoints: List[str] = field(default_factory=list)
    methods: List[str] = field(default_factory=list)
    regexPatterns: List[str] = field(default_factory=list)
    bodySearch: str = ""

# In-memory storage
requests: List[NetworkRequest] = []
sessions: Dict[str, HostSession] = {}
filters: FilterConfig = FilterConfig()
is_capturing: bool = False
port: int = 5000

def add_request(request: NetworkRequest):
    """Adds a new request to the store and updates the session."""
    global requests, sessions
    requests.insert(0, request)
    # Limit to 1000 requests to avoid memory issues
    requests = requests[:1000]

    session = sessions.get(request.host, HostSession(host=request.host))

    # Extract auth tokens
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header not in session.authTokens:
        session.authTokens.append(auth_header)

    # Extract cookies
    cookie_header = request.headers.get("cookie") or request.headers.get("Cookie")
    if cookie_header:
        for cookie in cookie_header.split(";"):
            key, _, value = cookie.partition("=")
            if key and value:
                session.cookies[key.strip()] = value.strip()

    # Extract interesting headers
    for key, value in request.headers.items():
        lower_key = key.lower()
        if (
            "auth" in lower_key
            or "token" in lower_key
            or "api-key" in lower_key
            or lower_key.startswith("x-")
        ):
            session.headers[key] = value

    session.lastUpdated = request.timestamp
    sessions[request.host] = session

def get_filtered_requests() -> List[NetworkRequest]:
    """Returns a list of requests that match the current filters."""
    if not any(
        [
            filters.ipAddresses,
            filters.hostnames,
            filters.protocols,
            filters.endpoints,
            filters.methods,
            filters.regexPatterns,
            filters.bodySearch,
        ]
    ):
        return requests

    # This is a placeholder for the full filtering logic
    # which will be implemented later.
    return requests

def clear_requests():
    """Clears all captured requests."""
    global requests
    requests.clear()

def clear_sessions():
    """Clears all session data."""
    global sessions
    sessions.clear()

def update_filters(new_filters: FilterConfig):
    """Updates the global filter configuration."""
    global filters
    filters = new_filters
