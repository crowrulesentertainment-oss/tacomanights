# OBS Studio setup

1. Install a current OBS Studio release.
2. Open Tools → WebSocket Server Settings and enable the server.
3. Keep it local, enable authentication and set a strong password.
4. Use the configured port (normally 4455) and put the address/password in the local bridge .env.
5. Create scenes named Network Main and Standby, or change the studio controls to match your scene names.
6. Run the bridge on the same PC and test its health endpoint.
7. Configure YouTube RTMPS and stream key inside OBS. Never put the stream key in this repository.
