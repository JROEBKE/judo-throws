(function () {
  const SERVICE_UUID = "8b7e1000-1234-4567-890a-bcdef0123456";
  const CHARACTERISTIC_UUID = "8b7e1001-1234-4567-890a-bcdef0123456";

  class JudoBluetoothController {
    constructor({ button, container, onPressed }) {
      this.button = button;
      this.container = container;
      this.onPressed = onPressed;
      this.device = null;
      this.characteristic = null;
      this.connecting = false;
      this.pressed = false;

      this.button.addEventListener("click", () => this.connect());
      this.button.disabled = !navigator.bluetooth;
      this.button.textContent = "Taster verbinden";
      this.setSelectionVisible(true);
      if (this.button.disabled) {
        this.setStatus("error", "Web Bluetooth ist in diesem Browser nicht verfügbar.");
      }
    }

    setStatus(state, errorMessage = "") {
      const connected = state === "connected";
      this.button.classList.toggle("connected", connected);
      this.button.textContent = connected ? "Taster verbunden" : "Taster verbinden";
      this.button.disabled = state === "connecting" || state === "connected" || !navigator.bluetooth;
      this.button.title = errorMessage;
    }

    setSelectionVisible(visible) {
      this.container.hidden = !visible;
    }

    async connect() {
      if (this.connecting || !navigator.bluetooth) return;

      this.connecting = true;
      this.setStatus("connecting", "Verbindung wird hergestellt …");

      try {
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [SERVICE_UUID]
        });

        this.device?.removeEventListener("gattserverdisconnected", this.handleDisconnect);
        this.characteristic?.removeEventListener("characteristicvaluechanged", this.handleNotification);
        this.device = device;
        device.addEventListener("gattserverdisconnected", this.handleDisconnect);

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        this.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
        this.characteristic.addEventListener("characteristicvaluechanged", this.handleNotification);
        await this.characteristic.startNotifications();

        if (!device.gatt.connected) {
          this.setStatus("interrupted", "Verbindung unterbrochen");
          return;
        }

        this.pressed = false;
        this.setStatus("connected", "Verbunden mit Judo");
      } catch (error) {
        this.device?.removeEventListener("gattserverdisconnected", this.handleDisconnect);
        this.characteristic?.removeEventListener("characteristicvaluechanged", this.handleNotification);
        if (this.device?.gatt?.connected) this.device.gatt.disconnect();
        this.device = null;
        this.characteristic = null;
        const message = `Verbindungsfehler: ${error.message || "Unbekannter Fehler"}`;
        console.error(message, error);
        this.setStatus("error", message);
      } finally {
        this.connecting = false;
      }
    }

    handleDisconnect = () => {
      this.characteristic?.removeEventListener("characteristicvaluechanged", this.handleNotification);
      this.characteristic = null;
      this.pressed = false;
      this.setStatus("interrupted", "Verbindung unterbrochen");
    };

    handleNotification = (event) => {
      const message = new TextDecoder().decode(event.target.value).replace(/\0/g, "").trim();

      if (message === "RELEASED") {
        this.pressed = false;
      } else if (message === "PRESSED" && !this.pressed) {
        this.pressed = true;
        this.onPressed();
      }
    };
  }

  window.JudoBluetoothController = JudoBluetoothController;
})();
