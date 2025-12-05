document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const clearBtn = document.getElementById('clear-btn');
    const requestList = document.getElementById('request-list');
    const requestDetail = document.getElementById('request-detail');

    let eventSource;
    let requests = [];

    const renderRequestList = () => {
        requestList.innerHTML = '';
        requests.forEach(req => {
            const li = document.createElement('li');
            li.textContent = `${req.method} ${req.host}${req.path}`;
            li.addEventListener('click', () => {
                renderRequestDetail(req);
            });
            requestList.appendChild(li);
        });
    };

    const renderRequestDetail = (req) => {
        let detailHtml = `
            <h3>${req.method} ${req.host}${req.path}</h3>
            <p><strong>Timestamp:</strong> ${new Date(req.timestamp).toLocaleString()}</p>
            <p><strong>Protocol:</strong> ${req.protocol}</p>
            <p><strong>IP:</strong> ${req.ip}:${req.port}</p>
            <h4>Headers</h4>
            <pre>${JSON.stringify(req.headers, null, 2)}</pre>
            <h4>Body</h4>
            <pre>${req.body}</pre>
        `;

        if (req.response) {
            detailHtml += `
                <h4>Response</h4>
                <p><strong>Status:</strong> ${req.response.statusCode}</p>
                <h5>Headers</h5>
                <pre>${JSON.stringify(req.response.headers, null, 2)}</pre>
                <h5>Body</h5>
                <pre>${req.response.body}</pre>
            `;
        }

        detailHtml += '<button id="replay-btn">Edit and Replay</button>';
        requestDetail.innerHTML = detailHtml;

        document.getElementById('replay-btn').addEventListener('click', () => {
            // Placeholder for replay functionality
            alert('Replay functionality not yet implemented.');
        });
    };

    startBtn.addEventListener('click', async () => {
        await fetch('/start', { method: 'POST' });
        startBtn.disabled = true;
        stopBtn.disabled = false;
        eventSource = new EventSource('/stream');
        eventSource.onmessage = (event) => {
            const req = JSON.parse(event.data);
            requests.unshift(req);
            renderRequestList();
        };
    });

    stopBtn.addEventListener('click', async () => {
        await fetch('/stop', { method: 'POST' });
        startBtn.disabled = false;
        stopBtn.disabled = true;
        if (eventSource) {
            eventSource.close();
        }
    });

    clearBtn.addEventListener('click', async () => {
        await fetch('/clear', { method: 'POST' });
        requests = [];
        renderRequestList();
        requestDetail.innerHTML = '<p>Select a request to see details.</p>';
    });

    // Initial load of any existing requests
    fetch('/requests')
        .then(res => res.json())
        .then(data => {
            requests = data;
            renderRequestList();
        });
});
