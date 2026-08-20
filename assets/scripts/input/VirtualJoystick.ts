import {
    _decorator,
    Component,
    EventTouch,
    game,
    Game,
    Node,
    UITransform,
    Vec2,
    Vec3,
} from 'cc';
import { KeyboardInput } from './KeyboardInput';

const { ccclass, property } = _decorator;

/** Converts one finger on a joystick base into analog horizontal and down input. */
@ccclass('VirtualJoystick')
export class VirtualJoystick extends Component {
    @property(KeyboardInput)
    public keyboardInput: KeyboardInput | null = null;

    @property(Node)
    public joystickHandle: Node | null = null;

    @property({ min: 1, tooltip: 'Maximum handle distance from the base center.' })
    public radius = 70;

    @property({ min: 0, max: 1, tooltip: 'Normalized horizontal values at or below this size output zero.' })
    public deadZone = 0.15;

    @property({ min: -1, max: 0, tooltip: 'Normalized Y value that activates down input.' })
    public downThreshold = -0.5;

    private activeTouchId: number | null = null;
    private listening = false;

    protected onEnable(): void {
        this.addListeners();
    }

    protected onDisable(): void {
        this.removeListeners();
        this.resetJoystick();
    }

    protected onDestroy(): void {
        this.removeListeners();
        this.resetJoystick();
    }

    private addListeners(): void {
        if (this.listening) {
            return;
        }

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        game.on(Game.EVENT_HIDE, this.resetJoystick, this);
        this.listening = true;
    }

    private removeListeners(): void {
        if (!this.listening) {
            return;
        }

        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        game.off(Game.EVENT_HIDE, this.resetJoystick, this);
        this.listening = false;
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

    private updateJoystick(event: EventTouch): void {
        const transform = this.getComponent(UITransform);
        if (!transform) {
            this.resetJoystick();
            return;
        }

        const uiLocation = event.getUILocation();
        const local = transform.convertToNodeSpaceAR(
            new Vec3(uiLocation.x, uiLocation.y, 0),
        );
        const offset = new Vec2(local.x, local.y);
        const safeRadius = Math.max(1, this.radius);
        if (offset.length() > safeRadius) {
            offset.normalize().multiplyScalar(safeRadius);
        }

        this.joystickHandle?.setPosition(offset.x, offset.y, 0);

        const normalizedX = offset.x / safeRadius;
        const deadZone = Math.max(0, Math.min(1, this.deadZone));
        const horizontal = Math.abs(normalizedX) <= deadZone ? 0 : normalizedX;
        this.keyboardInput?.setVirtualHorizontal(horizontal);
        const downThreshold = Math.max(-1, Math.min(0, this.downThreshold));
        this.keyboardInput?.setVirtualDown(offset.y / safeRadius <= downThreshold);
    }

    private resetJoystick(): void {
        this.activeTouchId = null;
        this.joystickHandle?.setPosition(0, 0, 0);
        this.keyboardInput?.setVirtualHorizontal(0);
        this.keyboardInput?.setVirtualDown(false);
    }
}
