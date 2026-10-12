// PS4 WebKit Remote Inspector - WebSocket connector
// Bridges inspector.html to the PS4's remote inspector on port 9224

(function() {
    var ws = null;
    var overlay = null;
    var statusEl = null;

    function createOverlay() {
        overlay = document.createElement('div');
        overlay.id = 'ps4-connect-overlay';
        overlay.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
            'background:rgba(0,0,0,0.85)', 'z-index:99999',
            'display:flex', 'align-items:center', 'justify-content:center',
            'font-family:Arial,sans-serif'
        ].join(';');

        overlay.innerHTML = [
            '<div style="background:#1e1e1e;border:1px solid #444;border-radius:8px;',
            'padding:32px 40px;min-width:340px;text-align:center;color:#eee;">',
            '<h2 style="margin:0 0 8px;color:#00aaff;font-size:20px;">PS4 Remote Inspector</h2>',
            '<p style="margin:0 0 20px;color:#999;font-size:13px;">',
            'Connect to PS4\'s WebKit remote inspector (port 9224)</p>',
            '<div style="display:flex;gap:8px;margin-bottom:16px;">',
            '<input id="ps4-ip" type="text" placeholder="192.168.1.x" ',
            'style="flex:1;padding:8px 12px;background:#111;border:1px solid #555;',
            'border-radius:4px;color:#eee;font-size:15px;" />',
            '<button id="ps4-connect-btn" ',
            'style="padding:8px 18px;background:#00aaff;color:#fff;border:none;',
            'border-radius:4px;font-size:15px;cursor:pointer;">Connect</button>',
            '</div>',
            '<div id="ps4-status" style="font-size:13px;min-height:18px;color:#ffaa00;"></div>',
            '</div>'
        ].join('');

        document.body.appendChild(overlay);
        statusEl = document.getElementById('ps4-status');

        var ipInput = document.getElementById('ps4-ip');
        var savedIp = localStorage.getItem('ps4-ip');
        if (savedIp) ipInput.value = savedIp;

        document.getElementById('ps4-connect-btn').addEventListener('click', function() {
            var ip = ipInput.value.trim();
            if (!ip) { setStatus('Enter a PS4 IP address.', '#ff5555'); return; }
            localStorage.setItem('ps4-ip', ip);
            connect(ip);
        });

        ipInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') document.getElementById('ps4-connect-btn').click();
        });
    }

    function setStatus(msg, color) {
        if (statusEl) {
            statusEl.textContent = msg;
            statusEl.style.color = color || '#ffaa00';
        }
    }

    function connect(ip) {
        setStatus('Connecting...', '#ffaa00');
        if (ws) { try { ws.close(); } catch(e) {} }

        try {
            ws = new WebSocket('ws://' + ip + ':9224');
        } catch(e) {
            setStatus('WebSocket error: ' + e.message, '#ff5555');
            return;
        }

        ws.onopen = function() {
            setStatus('Connected!', '#55ff55');
            setTimeout(function() {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                overlay = null;
            }, 600);

            // Wire outgoing messages (inspector → PS4)
            InspectorFrontendHost.sendMessageToBackend = function(message) {
                if (ws && ws.readyState === WebSocket.OPEN) ws.send(message);
            };
        };

        ws.onmessage = function(event) {
            // Wire incoming messages (PS4 → inspector)
            InspectorBackend.dispatch(event.data);
        };

        ws.onerror = function() {
            setStatus('Connection failed. Check IP and that PS4 is in debug mode.', '#ff5555');
        };

        ws.onclose = function() {
            if (!overlay) {
                // Reconnect UI
                createOverlay();
                setStatus('Disconnected. Re-enter PS4 IP to reconnect.', '#ff5555');
            }
        };
    }

    window.addEventListener('DOMContentLoaded', function() {
        createOverlay();
    });
})();
