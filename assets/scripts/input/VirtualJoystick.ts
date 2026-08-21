import { _decorator, Component, EventTouch, game, Game, isValid, Node, UITransform, Vec3 } from 'cc';
import { KeyboardInput } from './KeyboardInput';

const { ccclass, property } = _decorator;

/** Converts touches on a circular HUD joystick into virtual player input. */
@ccclass('VirtualJoystick')
export class VirtualJoystick extends Component {
    @property(KeyboardInput)
    public keyboardInput: KeyboardInput | null = null;

    @property(Node)
    public joystickHandle: Node | null = null;

    @property({ min: 0 })
    public radius = 70;

    @property({ range: [0, 1] })
    public deadZone = 0.15;

    @property({ range: [-1, 0] })
    public downThreshold = -0.5;

    private activeTouchId: number | null = null;
    private listening = false;
    private readonly touchPosition = new Vec3();

    protected onEnable(): void {
        if (this.listening || !isValid(this) || !isValid(this.node)) {
            return;
        }

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        game.on(Game.EVENT_HIDE, this.resetJoystick, this);
        this.listening = true;
    }

    protected onDisable(): void {
        this.removeListeners();
        this.resetJoystick();
    }

    protected onDestroy(): void {
        this.removeListeners();
        this.resetJoystick();
    }

    private onTouchStart(event: EventTouch): void {
        if (this.activeTouchId !== null) {
            return;
        }

        this.activeTouchId = event.getID();
        this.updateJoystick(event);
    }

    private onTouchMove(event: EventTouch): void {
        if (event.getID() === this.activeTouchId) {
            this.updateJoystick(event);
        }
    }

    private onTouchEnd(event: EventTouch): void {
        if (event.getID() === this.activeTouchId) {
            this.resetJoystick();
        }
    }

    private onTouchCancel(event: EventTouch): void {
        if (event.getID() === this.activeTouchId) {
            this.resetJoystick();
        }
    }

    private updateJoystick(event: EventTouch): void {
        if (!isValid(this) || !isValid(this.node)) {
            this.activeTouchId = null;
            return;
        }

        const transform = this.getComponent(UITransform);
        if (!transform || !isValid(transform)) {
            this.resetJoystick();
            return;
        }

        const uiPosition = event.getUILocation();
        transform.convertToNodeSpaceAR(
            this.touchPosition.set(uiPosition.x, uiPosition.y, 0),
            this.touchPosition,
        );

        const effectiveRadius = Math.max(0, this.radius);
        const distance = Math.hypot(this.touchPosition.x, this.touchPosition.y);
        if (effectiveRadius > 0 && distance > effectiveRadius) {
            const scale = effectiveRadius / distance;
            this.touchPosition.x *= scale;
            this.touchPosition.y *= scale;
        } else if (effectiveRadius === 0) {
            this.touchPosition.set(0, 0, 0);
        }

        if (this.joystickHandle && isValid(this.joystickHandle)) {
            this.joystickHandle.setPosition(this.touchPosition);
        }

        const normalizedX = effectiveRadius > 0 ? this.touchPosition.x / effectiveRadius : 0;
        const normalizedY = effectiveRadius > 0 ? this.touchPosition.y / effectiveRadius : 0;
        const horizontal = Math.abs(normalizedX) >= this.deadZone ? normalizedX : 0;
        if (this.keyboardInput && isValid(this.keyboardInput)) {
            this.keyboardInput.setVirtualHorizontal(horizontal);
            this.keyboardInput.setVirtualDown(normalizedY <= this.downThreshold);
        }
    }

    private readonly resetJoystick = (): void => {
        this.activeTouchId = null;
        if (this.joystickHandle && isValid(this.joystickHandle)) {
            this.joystickHandle.setPosition(0, 0, 0);
        }
        if (this.keyboardInput && isValid(this.keyboardInput)) {
            this.keyboardInput.setVirtualHorizontal(0);
            this.keyboardInput.setVirtualDown(false);
        }
    };

    private removeListeners(): void {
        if (!this.listening) {
            return;
        }

        if (isValid(this.node)) {
            this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }
        game.off(Game.EVENT_HIDE, this.resetJoystick, this);
        this.listening = false;
    }
}
