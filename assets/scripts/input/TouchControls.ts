import { _decorator, Component, game, Game, Node } from 'cc';
import { KeyboardInput } from './KeyboardInput';

const { ccclass, property } = _decorator;

/** Connects HUD touch targets to the player's platform-independent input state. */
@ccclass('TouchControls')
export class TouchControls extends Component {
    @property(KeyboardInput)
    public keyboardInput: KeyboardInput | null = null;

    @property(Node)
    public leftButton: Node | null = null;

    @property(Node)
    public rightButton: Node | null = null;

    @property(Node)
    public downButton: Node | null = null;

    @property(Node)
    public jumpButton: Node | null = null;

    private listening = false;

    protected onEnable(): void {
        this.addListeners();
    }

    protected onDisable(): void {
        this.removeListeners();
        this.releaseVirtualInput();
    }

    protected onDestroy(): void {
        this.removeListeners();
        this.releaseVirtualInput();
    }

    private addListeners(): void {
        if (this.listening) {
            return;
        }

        this.bindButton(this.leftButton, this.pressLeft, this.releaseLeft);
        this.bindButton(this.rightButton, this.pressRight, this.releaseRight);
        this.bindButton(this.downButton, this.pressDown, this.releaseDown);
        this.bindButton(this.jumpButton, this.pressJump, this.releaseJump);
        game.on(Game.EVENT_HIDE, this.releaseVirtualInput, this);
        this.listening = true;
    }

    private removeListeners(): void {
        if (!this.listening) {
            return;
        }

        this.unbindButton(this.leftButton, this.pressLeft, this.releaseLeft);
        this.unbindButton(this.rightButton, this.pressRight, this.releaseRight);
        this.unbindButton(this.downButton, this.pressDown, this.releaseDown);
        this.unbindButton(this.jumpButton, this.pressJump, this.releaseJump);
        game.off(Game.EVENT_HIDE, this.releaseVirtualInput, this);
        this.listening = false;
    }

    private bindButton(node: Node | null, press: () => void, release: () => void): void {
        if (!node) {
            return;
        }
        node.on(Node.EventType.TOUCH_START, press, this);
        node.on(Node.EventType.TOUCH_END, release, this);
        node.on(Node.EventType.TOUCH_CANCEL, release, this);
    }

    private unbindButton(node: Node | null, press: () => void, release: () => void): void {
        if (!node) {
            return;
        }
        node.off(Node.EventType.TOUCH_START, press, this);
        node.off(Node.EventType.TOUCH_END, release, this);
        node.off(Node.EventType.TOUCH_CANCEL, release, this);
    }

    private readonly pressLeft = (): void => this.keyboardInput?.setVirtualLeft(true);
    private readonly releaseLeft = (): void => this.keyboardInput?.setVirtualLeft(false);
    private readonly pressRight = (): void => this.keyboardInput?.setVirtualRight(true);
    private readonly releaseRight = (): void => this.keyboardInput?.setVirtualRight(false);
    private readonly pressDown = (): void => this.keyboardInput?.setVirtualDown(true);
    private readonly releaseDown = (): void => this.keyboardInput?.setVirtualDown(false);
    private readonly pressJump = (): void => this.keyboardInput?.setVirtualJump(true);
    private readonly releaseJump = (): void => this.keyboardInput?.setVirtualJump(false);

    private readonly releaseVirtualInput = (): void => {
        this.keyboardInput?.clearVirtualInput();
    };
}
