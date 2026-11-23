# Streamlabs Desktop setup

1. Open Streamlabs Desktop → Settings → Remote Control.
2. Enable local Remote Control and reveal connection details.
3. Store the token only in the ignored .env file on the broadcast computer.
4. Use the local SockJS endpoint shown by Streamlabs (commonly http://127.0.0.1:59650/api) and enter the token in STREAMLABS_TOKEN.
5. The bridge authenticates with TcpServerService, reads the current streaming state, lists scenes, switches scenes by name, and uses the documented StreamingService toggle methods for stream and recording. Verify each command with a private test broadcast before production.
6. Never expose Remote Control to the public internet.


## Tacoma Nights playout source
Add a Browser Source to each scene used for network programming. Set its URL to `http://127.0.0.1:8787/playout`, width 1920 and height 1080, and enable audio. Keep it visible. This browser source is the shared media playout path used by both Streamlabs Desktop and OBS. Pair Broadcast Studio with your Supabase sign-in and local bridge token; the Node process polls your approved queue and updates this local player.
