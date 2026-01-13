# Tesla Visual Status Card

A custom Home Assistant card that displays real-time Tesla vehicle status using layered transparent PNG images. This card provides a visual representation of your Tesla's current state including doors, trunk, frunk, charging status, and driving mode.

## Disclaimer

**This code was created with assistance from Claude AI.** I am not a professional coder. This project is provided **AS-IS** with **no support or warranties**. Feel free to fork, modify, and improve as needed.

## Prerequisites

- Home Assistant with Lovelace UI
- Tesla integration (one of the following):
  - TeslaMate with MQTT integration (recommended for faster updates)
  - Tesla Fleet API integration
  - Or a combination of both

## Features

- Real-time visual representation of vehicle state
- Layered image system for accurate door/trunk/frunk display
- Charging status visualization (plugged in vs actively charging)
- Driving mode detection
- Offline state indication (60% opacity)
- Special case handling for overlapping doors (FL + RL)
- Configurable card dimensions and positioning

## Installation

1. Copy `tesla-card.js` to your Home Assistant `/config/www/` directory
2. Add the card as a resource in your dashboard configuration:
   ```yaml
   resources:
     - url: /local/tesla-card.js
       type: module
   ```
3. Create the required image directory: `/config/www/tesla_doors/`
4. Add all required PNG images to this directory (see Image Requirements below)

## Configuration

Add the card to your Lovelace dashboard:

```yaml
type: custom:tesla-card
entity: sensor.tesla_battery_level
height: 280              # Image height in pixels (optional, default: 280)
card_height: 360         # Total card height (optional, default: height + 80)
background: transparent  # Card background (optional, default: var(--card-background-color))
image_width: 100%        # Image width (optional, default: 100%)
card_width: 100%         # Card width (optional, default: 100%)
image_position: center   # Image vertical position (optional: center, flex-start, flex-end, or custom like '20px')
```

## Required Entity Sensors

The card expects the following entities to be available in your Home Assistant instance:

### TeslaMate MQTT Sensors (Primary data source)
- `sensor.tesla_battery_level` - Battery percentage
- `sensor.tesla_state` - Vehicle state (online, asleep, offline, charging, driving)
- `sensor.tesla_shift_state` - Gear position (p, d, r, n)
- `binary_sensor.tesla_plugged_in` - Charging cable connection status
- `binary_sensor.tesla_frunk_open` - Frunk status
- `binary_sensor.tesla_trunk_open` - Trunk status

### Tesla Fleet API Sensors (Door sensors)
- `binary_sensor.mochi_front_driver_door` - Front left door
- `binary_sensor.mochi_front_passenger_door` - Front right door
- `binary_sensor.mochi_rear_driver_door` - Rear left door
- `binary_sensor.mochi_rear_passenger_door` - Rear right door

**Note:** Replace `tesla` and `mochi` prefixes with your actual entity names.

## Image Requirements

All images must be transparent PNG files placed in `/config/www/tesla_doors/`:

### Required Images

| Filename | Purpose | Description |
|----------|---------|-------------|
| `base.png` | Base layer | Car with all doors/trunk/frunk closed |
| `trunk_base.png` | Base layer (trunk open) | Car with trunk open, all doors closed |
| `fl.png` | Door overlay | Front left door open (transparent overlay) |
| `fr.png` | Door overlay | Front right door open (transparent overlay) |
| `rl.png` | Door overlay | Rear left door open (transparent overlay) |
| `rr.png` | Door overlay | Rear right door open (transparent overlay) |
| `flrl.png` | Door overlay (special case) | Front left AND rear left doors open together |
| `frunk.png` | Frunk overlay | Frunk open (transparent overlay) |
| `plug.png` | Charging/plugged state | Charging cable plugged in (base when plugged) |
| `frunk_base.png` | Charging/plugged state | Frunk open while plugged in (replaces plug.png) |
| `plug_FL.png` | Plugged-in door overlay | Front left door open while plugged in |
| `plug_FR.png` | Plugged-in door overlay | Front right door open while plugged in |
| `plug_RL.png` | Plugged-in door overlay | Rear left door open while plugged in |
| `plug_RR.png` | Plugged-in door overlay | Rear right door open while plugged in |
| `plug_FLRL.png` | Plugged-in door overlay (special case) | Front left AND rear left doors open while plugged in |
| `plug_trunk.png` | Plugged-in trunk overlay | Trunk open while plugged in |
| `charging.png` | Charging state | Actively charging overlay (top layer with animation/glow effect) |
| `driving.png` | Driving state | Vehicle in motion |

### Image Layer Logic

The card uses a layering system where images are stacked on top of each other:

```
Bottom Layer (Base):
├── trunk_base.png (if trunk is open AND NOT plugged in)
└── base.png (if trunk is closed AND NOT plugged in)

Middle Layers (Doors) - UNPLUGGED:
├── flrl.png (if BOTH front-left AND rear-left doors are open) *special case*
├── OR fl.png (if only front-left door is open)
├── OR rl.png (if only rear-left door is open)
├── fr.png (if front-right door is open)
└── rr.png (if rear-right door is open)

Top Layer - UNPLUGGED:
└── frunk.png (if frunk is open)

Special States:
└── driving.png (when vehicle is in gear D/R/N - replaces all layers)

Plugged-in State (not charging):
Base Layer:
├── frunk_base.png (if frunk is open while plugged in)
└── plug.png (if frunk is closed while plugged in)

Door Overlays (when plugged in):
├── plug_FLRL.png (if BOTH front-left AND rear-left doors are open) *special case*
├── OR plug_FL.png (if only front-left door is open)
├── OR plug_RL.png (if only rear-left door is open)
├── plug_FR.png (if front-right door is open)
└── plug_RR.png (if rear-right door is open)

Trunk Overlay (when plugged in):
└── plug_trunk.png (if trunk is open)

Charging State (actively charging):
Base Layer:
├── frunk_base.png (if frunk is open while charging)
└── plug.png (if frunk is closed while charging)

Door Overlays (when charging):
├── plug_FLRL.png (if BOTH front-left AND rear-left doors are open) *special case*
├── OR plug_FL.png (if only front-left door is open)
├── OR plug_RL.png (if only rear-left door is open)
├── plug_FR.png (if front-right door is open)
└── plug_RR.png (if rear-right door is open)

Trunk Overlay (when charging):
├── plug_trunk.png (if trunk is open)

Top Layer (when charging):
└── charging.png (always displayed on top when actively charging)
```

### Source Image File

The repository includes `tesla_UI_croppedWidth.psd`, a Photoshop document containing all the layered source images used to generate the individual PNG files. This PSD file includes:

- Base car image layer
- Individual door layers (FL, FR, RL, RR)
- Combined door layer (FL+RL)
- Trunk layers (base and overlay)
- Frunk layer
- Charging cable plugged state
- Plugged-in door layers (plug_FL, plug_FR, plug_RL, plug_RR)
- Plugged-in combined door layer (plug_FLRL)
- Plugged-in trunk layer (plug_trunk)
- Frunk base layer (for plugged-in state)
- Charging state layer
- Driving state layer

You can use this PSD file as a template to:
- Create images for different Tesla models (Model 3, Model X, Model S, Cybertruck)
- Modify colors or styling
- Add custom visual effects
- Generate additional special case combinations

**Note:** The PSD file uses transparent layers. Export each layer individually as PNG with transparency enabled to maintain the overlay effect.

### Special Case: FL + RL Door Handling

**Rationale:** When both the front-left (FL) and rear-left (RL) doors are open simultaneously, using individual transparent overlays creates a visual overlap issue. Due to the window transparency in the PNG images, the RL door overlay shows through the FL door's window area, creating an unrealistic appearance.

**Solution:** The `flrl.png` and `plug_FLRL.png` images are single combined images showing both doors open without transparency overlap. These special cases are automatically detected and used instead of layering individual door overlays.

**When they're used:**

**Unplugged state:**
- Both `binary_sensor.mochi_front_driver_door` AND `binary_sensor.mochi_rear_driver_door` are in the "on" state
- The card will use `flrl.png` instead of individual `fl.png` and `rl.png` overlays
- Other doors (FR, RR) will still use individual overlays

**Plugged-in/Charging state:**
- Both `binary_sensor.mochi_front_driver_door` AND `binary_sensor.mochi_rear_driver_door` are in the "on" state
- The vehicle is plugged in (with or without active charging)
- The card will use `plug_FLRL.png` instead of individual `plug_FL.png` and `plug_RL.png` overlays
- Other doors (FR, RR) will still use individual `plug_FR.png` and `plug_RR.png` overlays
- When actively charging, `charging.png` is displayed on top of all layers

## State Display Logic

### Vehicle States

The card displays different status text based on `sensor.tesla_state`:
- **Driving** - Vehicle is in gear (D/R/N), displays `driving.png`
- **Charging** - Vehicle is actively charging, displays `plug.png` + `charging.png`
- **Parked** - Vehicle is online but idle
- **Asleep** - Vehicle is in sleep mode (images display at 60% opacity)
- **Offline** - Vehicle is offline (images display at 60% opacity)

### Battery Color Coding

Battery percentage badge changes color based on level and state:
- **Green (#34C759)** - Charging or battery > 50%
- **Orange (#FF9500)** - Battery 21-50%
- **Red (#FF3B30)** - Battery ≤ 20%

### Visual State Indicators

The card uses visual opacity to indicate vehicle connectivity:
- **100% opacity** - Vehicle is online, parked, charging, or driving (active states)
- **60% opacity** - Vehicle is asleep or offline (inactive states)

## Customization

### Adjusting Image Size and Position

```yaml
type: custom:tesla-card
entity: sensor.tesla_battery_level
height: 350              # Make the car image larger
image_width: 120%        # Make the car wider
image_position: 20%      # Move the car up from center
```

### Changing Card Background

```yaml
type: custom:tesla-card
entity: sensor.tesla_battery_level
background: '#1a1a1a'    # Dark background
```

## Troubleshooting

### Card not appearing
- Verify `tesla-card.js` is in `/config/www/` directory
- Check that the resource is added to your dashboard configuration
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

### Images not loading
- Verify all required PNG files are in `/config/www/tesla_doors/` directory
- Check browser console for 404 errors
- Ensure file names match exactly (case-sensitive)

### Door states not updating
- Check that entity names match your Home Assistant configuration
- Open browser console and look for `Image selection inputs:` log messages
- Verify TeslaMate or Fleet integration is working correctly

### Trunk/Frunk showing open when closed
- This is a known issue with Tesla Fleet API
- The card uses TeslaMate MQTT sensors (`binary_sensor.tesla_trunk_open`, `binary_sensor.tesla_frunk_open`) which are more reliable
- Ensure TeslaMate integration is properly configured
- **Note:** TeslaMate sensors report states as `'open'`/`'closed'` (not `'on'`/`'off'` like typical binary sensors)

## Technical Details

### Why Both TeslaMate and Fleet?

This card uses a hybrid approach:
- **TeslaMate MQTT sensors** - Faster updates for status, battery, charging, trunk, frunk
- **Fleet API sensors** - Door sensors (as TeslaMate may not expose individual doors)

TeslaMate updates more frequently via MQTT, while Fleet API has polling intervals that can cause delays. This combination provides the best of both worlds.

### Console Logging

The card logs detailed information to the browser console for debugging:
- Image selection logic
- Layer composition
- Entity states used for decision making

Open browser developer tools (F12) to view these logs.

## Known Limitations

- Tesla Fleet API trunk/frunk states can get stuck as "open"
- Card is display-only (no control buttons)
- Requires manual creation of all image assets
- No day/night mode support
- Door sensors require Tesla Fleet API integration

## Contributing

This project is provided as-is without support. However, you are welcome to:
- Fork the repository
- Submit pull requests with improvements
- Create your own variations
- Share your custom image assets

## Credits

- Code created with assistance from Claude AI (Anthropic)
- Tesla vehicle integration via TeslaMate and Tesla Fleet API
- Home Assistant community for integration development

## License

This project is provided as-is with no warranty or support. Use at your own risk. Feel free to modify and distribute as needed.
