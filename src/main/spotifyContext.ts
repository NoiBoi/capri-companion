import { execFile } from 'node:child_process';

export interface PlayingTrack { title: string; artist: string; key: string }
// Read Windows' published media-session metadata. No Spotify login, browser, audio capture or control.
const SCRIPT = `
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
$capriAsTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\u00601' } | Select-Object -First 1
function CapriAwait($operation,$resultType) {
  $capriTask=$capriAsTask.MakeGenericMethod($resultType).Invoke($null,@($operation))
  if (!$capriTask.Wait(1800)) { throw 'Media session timeout' }
  return $capriTask.Result
}
$capriManager=CapriAwait ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$capriPlaying=@($capriManager.GetSessions() | Where-Object { $_.SourceAppUserModelId -match '(?i)spotify' -and $_.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing' })
if ($capriPlaying.Count -ne 1) { return }
$capriProperties=CapriAwait ($capriPlaying[0].TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime])
if ($capriProperties.Title -and $capriProperties.Artist) {
  [Console]::OutputEncoding=[Text.Encoding]::UTF8
  @{title=$capriProperties.Title;artist=$capriProperties.Artist;playing=$true;source=$capriPlaying[0].SourceAppUserModelId} | ConvertTo-Json -Compress
}
`;
export function parsePlayingTrack(raw: string): PlayingTrack | null {
  try {
    const v = JSON.parse(raw.replace(/^\uFEFF/, '').trim());
    if (v.playing !== true || typeof v.source !== 'string' || !/spotify/i.test(v.source) || typeof v.title !== 'string' || typeof v.artist !== 'string') return null;
    const clean = (s: string) => s.replace(/[\x00-\x1f<>]/g, '').trim().slice(0, 120);
    const title = clean(v.title), artist = clean(v.artist);
    if (!title || !artist) return null;
    return { title, artist, key: JSON.stringify([title.toLowerCase(), artist.toLowerCase()]) };
  } catch { return null; }
}
export function playingSpotify(signal?: AbortSignal): Promise<PlayingTrack | null> {
  if (process.platform !== 'win32' || signal?.aborted) return Promise.resolve(null);
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT],
      { windowsHide: true, timeout: 6500, maxBuffer: 16384, encoding: 'utf8', signal }, (error, stdout) => resolve(error ? null : parsePlayingTrack(stdout)));
  });
}
/** No polling: candidates arise only during an existing visit or foreground activity scene. */
export class SongBanterGate {
  private probeAt = -Infinity; private attemptedAt = -Infinity;
  private seen = new Map<string, number>();
  eligible(now: number) { return now - this.probeAt >= 5 * 60000 && now - this.attemptedAt >= 15 * 60000; }
  probe(now: number) { this.probeAt = now; }
  fresh(track: PlayingTrack, now: number) { const at = this.seen.get(track.key); return at === undefined || now - at >= 2 * 3600000; }
  attempted(track: PlayingTrack, now: number) {
    this.attemptedAt = now; this.seen.delete(track.key); this.seen.set(track.key, now);
    if (this.seen.size > 16) this.seen.delete(this.seen.keys().next().value!);
  }
}
