# Streamlabs Desktop setup

1. Open Streamlabs Desktop → Settings → Remote Control.
2. Enable local Remote Control and reveal connection details.
3. Store the token only in the ignored .env file on the broadcast computer.
4. Use the local SockJS endpoint shown by Streamlabs (commonly http://127.0.0.1:59650/api) and enter the token in STREAMLABS_TOKEN.
5. The bridge authenticates with TcpServerService, reads the current streaming state, lists scenes, switches scenes by name, and uses the documented StreamingService toggle methods for stream and recording. Verify each command with a private test broadcast before production.
6. Never expose Remote Control to the public internet.
