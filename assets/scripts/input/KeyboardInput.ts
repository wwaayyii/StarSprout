import { _decorator, Component, EventKeyboard, game, Game, input, Input, KeyCode } from 'cc';

const { ccclass } = _decorator;

/** Collects keyboard state for the local player. */
@ccclass('KeyboardInput')
export class KeyboardInput extends Component {
    private readonly heldKeys = new Set<KeyCode>();
    private jumpHeld = false;
    private jumpPressed = false;

    /** Horizontal intent in the range [-1, 1]. Opposing keys cancel out. */
    public get horizontal(): number {
        const leftHeld = this.heldKeys.has(KeyCode.KEY_A)
            || this.heldKeys.has(KeyCode.ARROW_LEFT);
        const rightHeld = this.heldKeys.has(KeyCode.KEY_D)
            || this.heldKeys.has(KeyCode.ARROW_RIGHT);
        return Number(rightHeld) - Number(leftHeld);
    }

    /** Whether either supported down key is currently held. */
    public get downHeld(): boolean {
        return this.heldKeys.has(KeyCode.KEY_S)
            || this.heldKeys.has(KeyCode.ARROW_DOWN);
    }

    /** Returns a jump press once, so holding Space cannot repeatedly jump. */
    public consumeJumpPressed(): boolean {
        const pressed = this.jumpPressed;
        this.jumpPressed = false;
        return pressed;
    }

    protected onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.on(Game.EVENT_HIDE, this.clearInput, this);
    }

    protected onDisable(): void {
        this.removeListeners();
        this.clearInput();
    }

    protected onDestroy(): void {
        this.removeListeners();
        this.clearInput();
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
                    this.jumpPressed = true;
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

    private clearInput(): void {
        this.heldKeys.clear();
        this.jumpHeld = false;
        this.jumpPressed = false;
    }

    private removeListeners(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.off(Game.EVENT_HIDE, this.clearInput, this);
    }
}
