class TeslaCard extends HTMLElement {
  set hass(hass) {
    if (!this._initialized) {
      this._initialize();
    }
    this._hass = hass;
    this._updateCard();
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    this.config = {
      ...config,
      height: config.height || 280,  // Image height
      card_height: config.card_height || null,  // Total card height (auto if not set)
      background: config.background || 'var(--card-background-color)',  // Default HA card background
      image_width: config.image_width || '100%',  // Default image width 100%
      card_width: config.card_width || '100%',  // Default card width 100%
      image_position: config.image_position || 'center'  // Default position center (flex-start, center, flex-end, or custom like '20px')
    };
  }

  _initialize() {
    this._initialized = true;
    const card = document.createElement('ha-card');
    card.style.cssText = `
      background: transparent;
      border-radius: 16px;
      overflow: hidden;
      padding: 0;
      box-shadow: none;
      width: ${this.config?.card_width || '100%'};
      max-width: 100%;
      margin: 0 auto;
    `;
    
    this.appendChild(card);
    this._card = card;
  }

  _updateCard() {
    if (!this._hass || !this.config) return;

    // Using TeslaMate MQTT sensors (faster)
    const battery = this._hass.states['sensor.tesla_battery_level'];
    const carState = this._hass.states['sensor.tesla_state'];
    const shiftState = this._hass.states['sensor.tesla_shift_state'];
    const chargeCable = this._hass.states['binary_sensor.tesla_plugged_in']; // TeslaMate MQTT
    
    // Use TeslaMate sensors for trunk/frunk (more reliable than Fleet API)
    const frunkSensor = this._hass.states['binary_sensor.tesla_frunk_open'];
    const trunkSensor = this._hass.states['binary_sensor.tesla_trunk_open'];
    
    // Convert TeslaMate binary sensors to cover-like state ('open' or 'closed')
    const frunk = frunkSensor?.state === 'on' ? { state: 'open' } : { state: 'closed' };
    const trunk = trunkSensor?.state === 'on' ? { state: 'open' } : { state: 'closed' };
    
    // Door sensors from Fleet
    const frontDriverDoor = this._hass.states['binary_sensor.mochi_front_driver_door'];
    const frontPassengerDoor = this._hass.states['binary_sensor.mochi_front_passenger_door'];
    const rearDriverDoor = this._hass.states['binary_sensor.mochi_rear_driver_door'];
    const rearPassengerDoor = this._hass.states['binary_sensor.mochi_rear_passenger_door'];

    const batteryLevel = battery?.state || '0';

    // Get all image layers
    const imageLayers = this._getImageLayers(
      carState?.state,  // Use carState for charging detection (state will be "charging")
      carState?.state,
      shiftState?.state,
      chargeCable?.state,
      frunk.state,  // Now using TeslaMate sensor converted to 'open'/'closed'
      trunk.state,  // Now using TeslaMate sensor converted to 'open'/'closed'
      frontDriverDoor?.state,
      frontPassengerDoor?.state,
      rearDriverDoor?.state,
      rearPassengerDoor?.state
    );

    // Get status text
    const statusText = this._getStatusText(carState?.state, shiftState?.state);
    
    const cardHeight = this.config.card_height || (this.config.height + 80);
    
    this._card.innerHTML = `
      <div style="padding: 24px; position: relative; background: ${this.config.background}; border-radius: 16px; height: ${cardHeight}px;">
        <!-- Status Header -->
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; position: relative; z-index: 10;">
          <div style="
            background: ${this._getBatteryColor(batteryLevel, carState?.state)};
            padding: 4px 12px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span style="font-size: 18px; font-weight: 600; color: white;">
              ${batteryLevel}%
            </span>
            ${carState?.state === 'charging' ? '<span style="color: white;">⚡</span>' : ''}
          </div>
          <div style="
            color: var(--secondary-text-color);
            font-size: 14px;
            font-weight: 500;
          ">
            ${statusText}
          </div>
        </div>

        <!-- Car Image Container with Stacked Layers -->
        <div style="
          position: absolute;
          width: 100%;
          height: ${this.config.height}px;
          left: 0;
          top: ${this.config.image_position === 'flex-start' ? '0' : 
                this.config.image_position === 'flex-end' ? 'auto' : 
                this.config.image_position === 'center' ? '50%' : 
                this.config.image_position};
          bottom: ${this.config.image_position === 'flex-end' ? '0' : 'auto'};
          overflow: hidden;
          z-index: 1;
          opacity: ${carState?.state === 'offline' || carState?.state === 'asleep' ? '0.6' : '1'};
        ">
          <div style="
            position: absolute;
            width: ${this.config.image_width};
            height: 100%;
            left: 50%;
            transform: translateX(-50%);
          ">
            ${imageLayers.map(img => `
              <img 
                src="${img}" 
                style="
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  object-fit: contain;
                  left: 0;
                  top: 0;
                "
                onerror="this.style.display='none'"
              />
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // No click handlers needed anymore
  }

  _getImageLayers(chargingState, carState, shiftState, chargeCable, frunk, trunk, fl, fr, rl, rr) {
    const base = '/local/tesla_doors';
    const layers = [];
    
    console.log('Image selection inputs:', {
      chargingState,
      carState,
      shiftState,
      chargeCable,
      trunk,
      frunk
    });
    
    // Driving state (completely replaces everything, no overlays)
    // Only show driving if shift state is a valid gear (not P, not empty, not unknown)
    if (shiftState && 
        shiftState !== 'p' && 
        shiftState !== 'P' && 
        shiftState !== '' && 
        shiftState !== 'unknown' &&
        shiftState !== 'unavailable') {
      layers.push(`${base}/driving.png`);
      console.log('Driving mode - layers:', layers);
      return layers;
    }

    // Charging state (prioritize this over cable sensor)
    if (chargingState === 'charging') {
      layers.push(`${base}/plug.png`);
      console.log('Charging - added plug.png');
      layers.push(`${base}/charging.png`);
      console.log('Actively charging - added charging.png');
      console.log('Charging - final layers:', layers);
      return layers;
    }

    // Plugged in but not charging
    if (chargeCable === 'on') {
      layers.push(`${base}/plug.png`);
      console.log('Cable plugged in (not charging) - added plug.png');
      console.log('Plugged in - final layers:', layers);
      return layers;
    }

    // Check door/trunk states
    const trunkOpen = trunk === 'open';
    const flOpen = fl === 'on';
    const frOpen = fr === 'on';
    const rlOpen = rl === 'on';
    const rrOpen = rr === 'on';
    const frunkOpen = frunk === 'open';

    // Check if FL + RL are both open (special case to avoid overlap)
    const flRlBothOpen = flOpen && rlOpen;

    // Step 1: Select base image
    if (trunkOpen) {
      // Trunk open = use trunk_base.png
      layers.push(`${base}/trunk_base.png`);
      console.log('Added trunk_base.png as base');
    } else {
      // Trunk closed = regular base
      layers.push(`${base}/base.png`);
      console.log('Added base.png as base');
    }

    // Step 2: Add door overlays
    // Special case: If both FL and RL are open, use flrl.png instead of individual overlays
    if (flRlBothOpen) {
      layers.push(`${base}/flrl.png`);
      console.log('Added flrl.png (FL + RL both open)');
    } else {
      // Individual door overlays
      if (flOpen) {
        layers.push(`${base}/fl.png`);
        console.log('Added fl.png overlay');
      }
      if (rlOpen) {
        layers.push(`${base}/rl.png`);
        console.log('Added rl.png overlay');
      }
    }
    
    // Add other doors (FR and RR always individual)
    if (frOpen) {
      layers.push(`${base}/fr.png`);
      console.log('Added fr.png overlay');
    }
    if (rrOpen) {
      layers.push(`${base}/rr.png`);
      console.log('Added rr.png overlay');
    }

    // Step 3: Add frunk overlay last (top layer)
    if (frunkOpen) {
      layers.push(`${base}/frunk.png`);
      console.log('Added frunk.png overlay on top');
    }

    console.log('Final layers:', layers);
    return layers;
  }

  _getStatusText(carState, shiftState) {
    if (shiftState && 
        shiftState !== 'p' && 
        shiftState !== 'P' && 
        shiftState !== '' && 
        shiftState !== 'unknown' &&
        shiftState !== 'unavailable') {
      return 'Driving';
    }
    if (carState === 'charging') {
      return 'Charging';
    }
    if (carState === 'asleep') {
      return 'Asleep';
    }
    if (carState === 'offline') {
      return 'Offline';
    }
    if (carState === 'online') {
      return 'Parked';
    }
    return 'Parked';
  }

  _getBatteryColor(level, carState) {
    const batteryNum = parseInt(level);
    if (carState === 'charging') {
      return '#34C759'; // Green when charging
    }
    if (batteryNum <= 20) {
      return '#FF3B30'; // Red
    }
    if (batteryNum <= 50) {
      return '#FF9500'; // Orange
    }
    return '#34C759'; // Green
  }

  getCardSize() {
    return 5;
  }
}

customElements.define('tesla-card', TeslaCard);