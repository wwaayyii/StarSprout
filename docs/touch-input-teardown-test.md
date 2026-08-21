# Touch input teardown smoke test

Use this short manual check after changing touch input or scene lifecycle code:

1. Enter `TestLevel`.
2. Move the virtual joystick, then press the attack button.
3. Click the back button while the touch controls have been used.
4. Enter `TestLevel` again and repeat the interaction and return flow several times.
5. Confirm the console contains no errors from `VirtualJoystick`, `TouchControls`, or
   `KeyboardInput` during scene destruction.

This specifically covers cleanup after joystick movement and attack input, including the
case where scene-owned button and joystick nodes are destroyed before their controller
components finish disabling.
