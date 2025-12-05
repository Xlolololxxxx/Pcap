from flask import Flask, render_template, Response, request, jsonify
import json
from . import storage, capture, replay
from .storage import NetworkRequest
import threading
import time
import queue

app = Flask(__name__, template_folder='web/templates', static_folder='web/static')
packet_queue = queue.Queue()

def packet_handler(packet: NetworkRequest):
    """Callback function to handle packets from the capture thread."""
    packet_queue.put(packet)

def capture_thread():
    """The thread that runs the packet capture."""
    # This is a placeholder for the real capture logic
    while storage.is_capturing:
        time.sleep(1)
        # In the real implementation, the pyshark callback would call packet_handler
    print("Capture thread stopped.")


@app.route('/')
def index():
    """Serves the main web UI."""
    return render_template('index.html')

@app.route('/stream')
def stream():
    """Streams captured requests to the client using SSE."""
    def event_stream():
        while True:
            packet = packet_queue.get()
            if packet is None:
                break
            # Convert dataclass to dict for JSON serialization
            data = json.dumps(packet.__dict__)
            yield f"data: {data}\n\n"
    return Response(event_stream(), mimetype='text/event-stream')

@app.route('/start', methods=['POST'])
def start_capture():
    """Starts the packet capture."""
    if not storage.is_capturing:
        storage.is_capturing = True
        # In a real app, you'd start the pyshark capture here.
        # For now, we'll start a simple thread.
        thread = threading.Thread(target=capture_thread)
        thread.daemon = True
        thread.start()
        print("Capture started.")
    return jsonify(success=True)

@app.route('/stop', methods=['POST'])
def stop_capture():
    """Stops the packet capture."""
    if storage.is_capturing:
        storage.is_capturing = False
        packet_queue.put(None) # To unblock the stream
        print("Capture stopped.")
    return jsonify(success=True)

@app.route('/replay', methods=['POST'])
def replay_request_endpoint():
    """Replays a request."""
    request_data = request.json
    network_request = NetworkRequest(**request_data)
    response = replay.replay_request(network_request)
    if response:
        return jsonify(status=response.status_code, headers=dict(response.headers), body=response.text)
    else:
        return jsonify(error="Failed to replay request"), 500

@app.route('/requests', methods=['GET'])
def get_requests():
    """Returns the list of captured requests."""
    return jsonify([req.__dict__ for req in storage.get_filtered_requests()])

@app.route('/clear', methods=['POST'])
def clear_all():
    """Clears all requests and sessions."""
    storage.clear_requests()
    storage.clear_sessions()
    return jsonify(success=True)
