# judo-throws

## Overview

Judo Throws is a lightweight browser-based training tool that helps judoka practice throw recognition and recall. It presents randomized throws from selectable throw groups and supports timed rounds, score-based training, and situation-based exercises with configurable throw combinations. Use it for focused solo practices.

## Bluetooth button

On Android, open the app in Chrome over HTTPS and tap **Taster verbinden** on a mode's setup screen. Select the BLE device **Judo** in the browser's device picker. The picker searches all devices because the buzzer does not include its name in the advertising data. The app then accesses the configured service UUID. The Bluetooth button starts the selected mode, advances the score in highscore modes, and stops other running modes. If the connection is interrupted, return to a setup screen and tap **Taster verbinden** to pair again.

