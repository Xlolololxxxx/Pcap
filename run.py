from pcap_analyzer.server import app
import os
import signal
import psutil

def find_and_kill_process_on_port(port):
    """Finds and kills a process running on the given port."""
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            for conn in proc.connections(kind='inet'):
                if conn.laddr.port == port:
                    print(f"Found process {proc.info['name']} (PID {proc.pid}) on port {port}. Terminating.")
                    os.kill(proc.pid, signal.SIGTERM)
                    return True
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return False

if __name__ == '__main__':
    # Define the port your app will run on
    APP_PORT = 5001  # Assuming this is the HTTP port from the original script

    # Kill any existing process on that port
    find_and_kill_process_on_port(APP_PORT)

    # Run the Flask app
    app.run(host='0.0.0.0', port=APP_PORT, debug=False, use_reloader=False)
