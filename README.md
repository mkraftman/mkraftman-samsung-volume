# Mkraftman Samsung Volume

Custom Home Assistant Lovelace card for controlling Samsung TV volume. Features a pill-shaped slider with mute toggle and volume +/- buttons. Visual twin of [Mkraftman Trinnov Volume](https://github.com/mkraftman/mkraftman-trinnov-volume), driven by a `media_player` entity (e.g. the core `samsungtv` integration).

## Features

- Pill-shaped slider matching mushroom card aesthetics
- Mute toggle button (via `media_player.volume_mute`)
- Volume +/- buttons (1-step on the TV's 0–100 scale)
- Optimistic UI updates — slider responds instantly during drag
- Throttled service calls (max 1 per 200ms) to avoid overloading HA
- Graceful handling of off / unavailable entities

## Installation

### HACS

1. Add this repository as a custom repository in HACS (category: Lovelace)
2. Install "Mkraftman Samsung Volume"
3. Add the resource in your Lovelace configuration

### Manual

1. Copy `dist/mkraftman-samsung-volume.js` to `www/community/mkraftman-samsung-volume/`
2. Add the resource:
   ```yaml
   resources:
     - url: /hacsfiles/mkraftman-samsung-volume/mkraftman-samsung-volume.js
       type: module
   ```

## Configuration

```yaml
type: custom:mkraftman-samsung-volume
entity: media_player.master_bedroom_samsung_83qe83s95fa_oled_tv
```

| Option   | Required | Description                                         |
| -------- | -------- | --------------------------------------------------- |
| `entity` | Yes      | Media player entity (volume and mute are read from its attributes) |

## Layout

```
[Mute Icon]  32                  [Vol-] [Vol+]
[============= SLIDER (full width) =============]
```
