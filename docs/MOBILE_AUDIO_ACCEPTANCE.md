# Live mobile audio acceptance

The implementation has desktop-browser network emulation and mobile viewport checks. These do not establish physical-phone or deployed-site performance.

Before live acceptance, supply the deployed application URL and access to a real Android/Chrome and iPhone/Safari device. The current project configuration points to localhost. No deployment or CDN provisioning is implied by the local verification.

The repo now includes a device-side recorder in **Admin → System → Listening check on this device**, and a read-only `npm run audio:verify -- --url ...` deployment preflight. See [setup and report details](AUDIO_DEPLOYMENT.md). The recorder uses the shared player and offers a local JSON download without uploading results.

On each phone:

1. Test the deployed production build on an actual cellular connection. Record device/browser, network, selected quality and whether this is the first or a repeat listen. Keep browser audio caching and server preview caching distinct when reporting results.
2. Start a producer preview and a full-length homepage listening demo. Measure tap-to-playback and count buffering pauses. Repeat at least five times per quality. Check a complete 30-second preview, not only its first few seconds.
3. Switch Data saver during playback and while paused. Confirm the position is retained, playback does not overlap, and the explicit demo download still offers the original demo.
4. Turn connectivity off and back on. Confirm offline feedback, the eight-second slow-connection hint and the 25-second timeout/retry behavior. Reconnecting alone must not start paused audio.
5. Seek forward/back, switch tracks and navigate between pages. Check the compact dock and expanded sheet in portrait/landscape, including focus, scrolling and touch targets.
6. Confirm ordinary listening requests only preview/listening-copy URLs. Check paid-original downloads separately with authorized sandbox fixtures; never simulate a real successful purchase in customer data.

For optional CDN delivery, verify HTTPS, the actual application origin's CORS response, audio decoding, byte ranges and the measured cold/warm startup before enabling `MEDIA_PREVIEW_DELIVERY=cdn`. CDN visibility/revocation rules must be agreed before assigning a long cache lifetime to public previews. Purchased originals must stay on authenticated proxy delivery.
