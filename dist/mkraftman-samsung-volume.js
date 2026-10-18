/**
 * mkraftman-samsung-volume
 * Custom HACS card for Samsung TV volume control (media_player entity).
 * Pill-shaped slider with mute toggle and vol +/- buttons.
 * Mirrors mkraftman-trinnov-volume; volume is shown on the TV's 0–100 scale.
 */

class MkraftmanSamsungVolume extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._el = {};
    this._built = false;
    this._dragging = false;
    this._optimisticValue = null;
    this._throttleTimer = null;
    this._pendingValue = null;
    this._lastSentTime = 0;
  }

  static getConfigElement() {
    return undefined;
  }

  static getStubConfig() {
    return {
      entity: "media_player.master_bedroom_samsung_83qe83s95fa_oled_tv",
    };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("You must specify an 'entity'");
    this._config = config;
    if (this._hass) this._build();
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    return { rows: 2, columns: 12, min_rows: 2, min_columns: 6 };
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;

    if (!this._config) return;

    const entity = this._config.entity;

    const volState = hass.states[entity];
    const prevVol = prev && prev.states[entity];

    // Volume and mute are both attributes of the media_player, so any
    // change to either bumps last_updated.
    const volChanged =
      !prevVol ||
      prevVol.state !== (volState && volState.state) ||
      prevVol.last_updated !== (volState && volState.last_updated);

    if (!this._built) {
      this._build();
      return;
    }

    if (volChanged) {
      this._update();
    }
  }

  _build() {
    if (this._built || !this._hass || !this._config) return;

    const shadow = this.shadowRoot;
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .card {
          background: #132532;
          border-radius: 12px;
          padding: 12px;
          box-sizing: border-box;
        }
        .top-row {
          display: flex;
          align-items: center;
          gap: 0;
          margin-bottom: 8px;
        }
        .mute-btn {
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          background: rgba(var(--rgb-blue, 68, 115, 158), 0.2);
          color: var(--primary-text-color, #fff);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: background 0.15s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .mute-btn:active {
          background: rgba(var(--rgb-blue, 68, 115, 158), 0.35);
        }
        .mute-btn.muted {
          color: var(--error-color, #db4437);
        }
        .mute-btn ha-icon {
          transform: scale(1.7);
        }
        .vol-display {
          flex-shrink: 0;
          text-align: left;
          font-size: 18px;
          font-weight: 500;
          color: var(--primary-text-color, #fff);
          white-space: nowrap;
          user-select: none;
          margin-left: 10px;
        }
        .vol-display.unavailable {
          opacity: 0.4;
        }
        .vol-btns {
          flex-shrink: 0;
          display: flex;
          gap: 6px;
          margin-left: 8px;
        }
        .vol-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(var(--rgb-blue, 68, 115, 158), 0.2);
          color: var(--primary-text-color, #fff);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          margin: 0;
          font-size: 29px;
          font-weight: 700;
          line-height: 1;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .vol-btn:active {
          background: rgba(var(--rgb-blue, 68, 115, 158), 0.35);
        }
        .vol-btn:disabled,
        .mute-btn:disabled {
          opacity: 0.3;
          cursor: default;
        }

        /* --- Slider --- */
        .slider-row {
          width: 100%;
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 42px;
          border-radius: 8px;
          outline: none;
          background: linear-gradient(
            to right,
            #009AC7 0%,
            #009AC7 var(--fill-pct, 0%),
            #0F3C5A var(--fill-pct, 0%),
            #0F3C5A 100%
          );
          cursor: pointer;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        input[type="range"]:disabled {
          opacity: 0.3;
          cursor: default;
        }

        /* Webkit thumb */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 42px;
          border-radius: 4px;
          background: #FFFFFF;
          border: none;
          cursor: pointer;
        }
        input[type="range"]:disabled::-webkit-slider-thumb {
          cursor: default;
        }

        /* Firefox track */
        input[type="range"]::-moz-range-track {
          height: 42px;
          border-radius: 8px;
          background: transparent;
          border: none;
        }
        /* Firefox progress (filled portion) */
        input[type="range"]::-moz-range-progress {
          height: 42px;
          border-radius: 8px 0 0 8px;
          background: #009AC7;
        }
        /* Firefox thumb */
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 42px;
          border-radius: 4px;
          background: #FFFFFF;
          border: none;
          cursor: pointer;
        }
        input[type="range"]:disabled::-moz-range-thumb {
          cursor: default;
        }
      </style>

      <div class="card">
        <div class="top-row">
          <button class="mute-btn" id="muteBtn">
            <ha-icon icon="mdi:volume-high"></ha-icon>
          </button>
          <div class="vol-display" id="volDisplay">—</div>
          <div style="flex:1"></div>
          <div class="vol-btns">
            <button class="vol-btn" id="volDown">&minus;</button>
            <button class="vol-btn" id="volUp">&plus;</button>
          </div>
        </div>
        <div class="slider-row">
          <input type="range" id="slider" min="0" max="100" step="1" value="0" />
        </div>
      </div>
    `;

    this._el.muteBtn = shadow.getElementById("muteBtn");
    this._el.muteIcon = this._el.muteBtn.querySelector("ha-icon");
    this._el.volDisplay = shadow.getElementById("volDisplay");
    this._el.volDown = shadow.getElementById("volDown");
    this._el.volUp = shadow.getElementById("volUp");
    this._el.slider = shadow.getElementById("slider");

    // Mute button
    this._el.muteBtn.addEventListener("click", () => this._toggleMute());

    // Vol +/- buttons
    this._el.volDown.addEventListener("click", () => this._stepVolume(-1));
    this._el.volUp.addEventListener("click", () => this._stepVolume(1));

    // Slider drag — optimistic + throttled
    this._el.slider.addEventListener("input", () => {
      this._dragging = true;
      const val = parseFloat(this._el.slider.value);
      this._optimisticValue = val;
      this._updateDisplay(val);
      this._throttledSend(val);
    });

    this._el.slider.addEventListener("change", () => {
      const val = parseFloat(this._el.slider.value);
      this._dragging = false;
      this._optimisticValue = null;
      this._sendValue(val, true); // immediate, unthrottled
    });

    // Also handle touchend to be safe
    this._el.slider.addEventListener("touchend", () => {
      if (this._dragging) {
        const val = parseFloat(this._el.slider.value);
        this._dragging = false;
        this._optimisticValue = null;
        this._sendValue(val, true);
      }
    });

    this._built = true;
    this._update();
  }

  _isUnavailable(volState) {
    return (
      !volState ||
      volState.state === "unavailable" ||
      volState.state === "unknown" ||
      volState.state === "off" ||
      !volState.attributes ||
      volState.attributes.volume_level == null
    );
  }

  _update() {
    if (!this._built || !this._hass || !this._config) return;

    const volState = this._hass.states[this._config.entity];
    const unavailable = this._isUnavailable(volState);

    // Disable controls when unavailable (TV off has no volume attributes)
    this._el.slider.disabled = unavailable;
    this._el.volDown.disabled = unavailable;
    this._el.volUp.disabled = unavailable;
    this._el.muteBtn.disabled = unavailable;

    if (unavailable) {
      this._el.volDisplay.textContent =
        volState && volState.state === "off" ? "Off" : "Unavailable";
      this._el.volDisplay.classList.add("unavailable");
      return;
    }
    this._el.volDisplay.classList.remove("unavailable");

    // Volume (media_player volume_level 0–1 → TV scale 0–100)
    const attrs = volState.attributes;
    const vol = Math.round(parseFloat(attrs.volume_level) * 100);

    // Don't fight user during drag
    if (!this._dragging && this._optimisticValue === null) {
      this._el.slider.value = vol;
      this._updateDisplay(vol);
    }

    // Mute state
    const isMuted = attrs.is_volume_muted === true;
    if (isMuted) {
      this._el.muteBtn.classList.add("muted");
      this._el.muteIcon.icon = "mdi:volume-off";
    } else {
      this._el.muteBtn.classList.remove("muted");
      this._el.muteIcon.icon = "mdi:volume-high";
    }
  }

  _updateDisplay(val) {
    const v = Math.round(parseFloat(val));
    this._el.volDisplay.textContent = String(v);
    // Update fill percentage
    const min = parseFloat(this._el.slider.min);
    const max = parseFloat(this._el.slider.max);
    const pct = ((v - min) / (max - min)) * 100;
    this._el.slider.style.setProperty("--fill-pct", pct + "%");
  }

  _throttledSend(val) {
    const now = Date.now();
    const elapsed = now - this._lastSentTime;

    if (elapsed >= 200) {
      // Leading edge: send immediately
      this._sendValue(val, false);
    } else {
      // Schedule trailing edge
      this._pendingValue = val;
      if (!this._throttleTimer) {
        this._throttleTimer = setTimeout(() => {
          this._throttleTimer = null;
          if (this._pendingValue !== null) {
            this._sendValue(this._pendingValue, false);
            this._pendingValue = null;
          }
        }, 200 - elapsed);
      }
    }
  }

  _sendValue(val, immediate) {
    if (!this._hass || !this._config) return;

    if (immediate) {
      // Clear any pending throttle
      if (this._throttleTimer) {
        clearTimeout(this._throttleTimer);
        this._throttleTimer = null;
        this._pendingValue = null;
      }
    }

    this._lastSentTime = Date.now();
    this._hass.callService("media_player", "volume_set", {
      entity_id: this._config.entity,
      volume_level: Math.round(val) / 100,
    });
  }

  _stepVolume(delta) {
    if (!this._hass || !this._config) return;
    const volState = this._hass.states[this._config.entity];
    if (this._isUnavailable(volState)) return;

    const current =
      this._optimisticValue !== null
        ? this._optimisticValue
        : Math.round(parseFloat(volState.attributes.volume_level) * 100);

    const newVal = Math.min(100, Math.max(0, Math.round(current + delta)));

    // Optimistic update
    this._optimisticValue = newVal;
    this._el.slider.value = newVal;
    this._updateDisplay(newVal);

    this._throttledSend(newVal);

    // Clear optimistic after a short delay to let HA catch up
    clearTimeout(this._optimisticClearTimer);
    this._optimisticClearTimer = setTimeout(() => {
      this._optimisticValue = null;
      this._update();
    }, 800);
  }

  _toggleMute() {
    if (!this._hass || !this._config) return;
    const volState = this._hass.states[this._config.entity];
    if (this._isUnavailable(volState)) return;

    this._hass.callService("media_player", "volume_mute", {
      entity_id: this._config.entity,
      is_volume_muted: volState.attributes.is_volume_muted !== true,
    });
  }

  connectedCallback() {
    if (this._hass && this._config && !this._built) {
      this._build();
    }
  }

  disconnectedCallback() {
    if (this._throttleTimer) {
      clearTimeout(this._throttleTimer);
      this._throttleTimer = null;
    }
    if (this._optimisticClearTimer) {
      clearTimeout(this._optimisticClearTimer);
      this._optimisticClearTimer = null;
    }
    this._pendingValue = null;
  }
}

customElements.define("mkraftman-samsung-volume", MkraftmanSamsungVolume);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mkraftman-samsung-volume",
  name: "Mkraftman Samsung Volume",
  description: "Volume control card for Samsung TVs with mute toggle and vol +/- buttons.",
});
