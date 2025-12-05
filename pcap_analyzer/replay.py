import requests
from .storage import NetworkRequest

def replay_request(request: NetworkRequest):
    """
    Replays an HTTP request.
    """
    try:
        response = requests.request(
            method=request.method,
            url=f"{request.protocol.lower()}://{request.host}:{request.port}{request.path}",
            headers=request.headers,
            data=request.body,
            verify=False  # In a real app, you'd want to handle certs better
        )
        print(f"Replayed request to {request.host}, status: {response.status_code}")
        return response
    except requests.exceptions.RequestException as e:
        print(f"Error replaying request: {e}")
        return None
