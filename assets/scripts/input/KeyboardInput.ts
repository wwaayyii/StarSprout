import { _decorator, Component, EventKeyboard, game, Game, input, Input, KeyCode } from 'cc';

const { ccclass } = _decorator;

/** Collects keyboard state for the local player. */
@ccclass('KeyboardInput')
export class KeyboardInput extends Component {
    private readonly heldKeys = new Set<KeyCode>();
    private jumpHeld = false;
    private keyboardJumpPressed = false;
    private virtualLeftHeld = false;
    private virtualRightHeld = false;
    private virtualDownHeld = false;
    private virtualJumpHeld = false;
    private virtualJumpPressed = false;
    private virtualHorizontal = 0;

    /** Horizontal intent in the range [-1, 1]. Opposing keys cancel out. */
    public get horizontal(): number {
        const leftHeld = this.heldKeys.has(KeyCode.KEY_A)
            || this.heldKeys.has(KeyCode.ARROW_LEFT);
        const rightHeld = this.heldKeys.has(KeyCode.KEY_D)
            || this.heldKeys.has(KeyCode.ARROW_RIGHT);
        const keyboardHorizontal = Number(rightHeld) - Number(leftHeld);
        if (leftHeld || rightHeld) {
            return keyboardHorizontal;
        }

        const buttonHorizontal = Number(this.virtualRightHeld) - Number(this.virtualLeftHeld);
        return this.virtualLeftHeld || this.virtualRightHeld
            ? buttonHorizontal
            : this.virtualHorizontal;
    }

    /** Whether either supported down key is currently held. */
    public get downHeld(): boolean {
        return this.virtualDownHeld
            || this.heldKeys.has(KeyCode.KEY_S)
            || this.heldKeys.has(KeyCode.ARROW_DOWN);
    }

    public setVirtualLeft(held: boolean): void {
        this.virtualLeftHeld = held;
    }

    public setVirtualRight(held: boolean): void {
        this.virtualRightHeld = held;
    }

    public setVirtualDown(held: boolean): void {
        this.virtualDownHeld = held;
    }

    /** Sets analog horizontal intent from a virtual joystick. */
    public setVirtualHorizontal(value: number): void {
        this.virtualHorizontal = Math.max(-1, Math.min(1, value));
    }

    /** Updates the virtual jump button and records only its pressed edge. */
    public setVirtualJump(held: boolean): void {
        if (held && !this.virtualJumpHeld) {
            this.virtualJumpPressed = true;
        }
        this.virtualJumpHeld = held;
    }

    /** Cancels only virtual jump state, leaving other touch controls intact. */
    public cancelVirtualJump(): void {
        this.virtualJumpHeld = false;
        this.virtualJumpPressed = false;
    }

    /** Releases virtual controls without disturbing physical keyboard state. */
    public clearVirtualInput(): void {
        this.virtualLeftHeld = false;
        this.virtualRightHeld = false;
        this.virtualDownHeld = false;
        this.virtualJumpHeld = false;
        this.virtualJumpPressed = false;
        this.virtualHorizontal = 0;
    }

    /** Returns a jump press once, so holding Space cannot repeatedly jump. */
    public consumeJumpPressed(): boolean {
        const pressed = this.keyboardJumpPressed || this.virtualJumpPressed;
        this.keyboardJumpPressed = false;
        this.virtualJumpPressed = false;
        return pressed;
    }

    protected onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.on(Game.EVENT_HIDE, this.clearState, this);
    }

    protected onDisable(): void {
        this.removeListeners();
        this.clearState();
    }

    protected onDestroy(): void {
        this.removeListeners();
        this.clearState();
    }

    private onKeyDown(event: EventKeyboard): void {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.heldKeys.add(event.keyCode);
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.heldKeys.add(event.keyCode);
                break;
            case KeyCode.SPACE:
                if (!this.jumpHeld) {
                    this.keyboardJumpPressed = true;
                }
                this.jumpHeld = true;
                break;
        }
    }

    private onKeyUp(event: EventKeyboard): void {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.heldKeys.delete(event.keyCode);
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.heldKeys.delete(event.keyCode);
                break;
            case KeyCode.SPACE:
                this.jumpHeld = false;
                break;
        }
    }

    /** Clears every input source when this component can no longer receive releases. */
    private clearState(): void {
        this.heldKeys.clear();
        this.jumpHeld = false;
        this.clearVirtualInput();
        this.keyboardJumpPressed = false;
        this.virtualJumpPressed = false;
    }

    private removeListeners(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.off(Game.EVENT_HIDE, this.clearState, this);
    }
}
