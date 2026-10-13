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
      this.button.disabled = false;
      this.button.textContent = "Taster verbinden";
      this.setSelectionVisible(true);
    }

    setStatus(state, errorMessage = "") {
      const connected = state === "connected";
      this.button.classList.toggle("connected", connected);
      this.button.textContent = connected ? "Taster verbunden" : "Taster verbinden";
      this.button.disabled = state === "connecting";
      this.button.title = errorMessage;
    }

    setSelectionVisible(visible) {
      this.container.hidden = !visible;
    }

    connect() {
      if (this.connecting) return;

      if (!navigator.bluetooth) {
        this.showConnectionError(new Error("Web Bluetooth ist in diesem Browser nicht verfügbar."));
        return;
      }

      let deviceRequest;
      try {
        deviceRequest = navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [SERVICE_UUID]
        });
      } catch (error) {
        this.showConnectionError(error);
        return;
      }

      this.connecting = true;
      this.setStatus("connecting", "Verbindung wird hergestellt …");
      this.connectToDevice(deviceRequest);
    }

    async connectToDevice(deviceRequest) {
      try {
        const device = await deviceRequest;

        if (this.device && this.device !== device) {
          this.device.gatt?.disconnect();
        }
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
        this.showConnectionError(error);
      } finally {
        this.connecting = false;
      }
    }

    showConnectionError(error) {
      const message = `Bluetooth-Verbindung fehlgeschlagen: ${error.message || "Unbekannter Fehler"}`;
      this.setStatus("error", message);

      if (error.name !== "NotFoundError") {
        console.error(message, error);
        window.alert(message);
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
