# Streamlabs Desktop setup

1. Open Streamlabs Desktop → Settings → Remote Control.
2. Enable local Remote Control and reveal connection details.
3. Store the token only in the ignored .env file on the broadcast computer.
4. Verify the exact WebSocket endpoint and message protocol for your installed version.
5. Current adapter performs a connection handshake only. Scene, stream and recording commands intentionally fail closed until protocol verification and testing.
6. Never expose Remote Control to the public internet.
