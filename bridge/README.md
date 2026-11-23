# Tacoma Nights local broadcast bridge

Install Node.js 20 or newer. Copy .env.example to .env and set a random BRIDGE_TOKEN of at least 32 characters. Configure OBS WebSocket on localhost with authentication. Run npm install then npm start.

The service binds to 127.0.0.1 by default. Keep it local; never expose this API or OBS/Streamlabs control ports to the internet. OBS scene, stream and recording actions are implemented. Streamlabs currently has a connection-only adapter: its commands remain disabled until the exact installed Desktop Remote Control API schema is verified. The website bridge connection requires a local trusted development origin and a browser-safe token configuration; do not publish privileged credentials in GitHub Pages.


For the browser studio, serve the repository locally at http://127.0.0.1:8000 (for example with a local static server) and open /studio/. The studio prompts for the bridge token each session; it is held only in page memory and is not committed to GitHub. GitHub Pages is intentionally not allowed to call the localhost bridge directly.
