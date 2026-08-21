import { _decorator, Component, game, Game, isValid, Node } from 'cc';
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

    @property(Node)
    public attackButton: Node | null = null;

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
        if (this.listening || !isValid(this) || !isValid(this.node)) {
            return;
        }

        this.bindButton(this.leftButton, this.pressLeft, this.releaseLeft, this.releaseLeft);
        this.bindButton(this.rightButton, this.pressRight, this.releaseRight, this.releaseRight);
        this.bindButton(this.downButton, this.pressDown, this.releaseDown, this.releaseDown);
        this.bindButton(this.jumpButton, this.pressJump, this.releaseJump, this.cancelJump);
        if (this.attackButton && isValid(this.attackButton)) {
            this.attackButton.on(Node.EventType.TOUCH_START, this.pressAttack, this);
        }
        game.on(Game.EVENT_HIDE, this.releaseVirtualInput, this);
        this.listening = true;
    }

    private removeListeners(): void {
        if (!this.listening) {
            return;
        }

        this.unbindButton(this.leftButton, this.pressLeft, this.releaseLeft, this.releaseLeft);
        this.unbindButton(this.rightButton, this.pressRight, this.releaseRight, this.releaseRight);
        this.unbindButton(this.downButton, this.pressDown, this.releaseDown, this.releaseDown);
        this.unbindButton(this.jumpButton, this.pressJump, this.releaseJump, this.cancelJump);
        if (this.attackButton && isValid(this.attackButton)) {
            this.attackButton.off(Node.EventType.TOUCH_START, this.pressAttack, this);
        }
        game.off(Game.EVENT_HIDE, this.releaseVirtualInput, this);
        this.listening = false;
    }

    private bindButton(
        node: Node | null,
        press: () => void,
        release: () => void,
        cancel: () => void,
    ): void {
        if (!node || !isValid(node)) {
            return;
        }
        node.on(Node.EventType.TOUCH_START, press, this);
        node.on(Node.EventType.TOUCH_END, release, this);
        node.on(Node.EventType.TOUCH_CANCEL, cancel, this);
    }

    private unbindButton(
        node: Node | null,
        press: () => void,
        release: () => void,
        cancel: () => void,
    ): void {
        if (!node || !isValid(node)) {
            return;
        }
        node.off(Node.EventType.TOUCH_START, press, this);
        node.off(Node.EventType.TOUCH_END, release, this);
        node.off(Node.EventType.TOUCH_CANCEL, cancel, this);
    }

    private readonly pressLeft = (): void => this.withKeyboardInput(input => input.setVirtualLeft(true));
    private readonly releaseLeft = (): void => this.withKeyboardInput(input => input.setVirtualLeft(false));
    private readonly pressRight = (): void => this.withKeyboardInput(input => input.setVirtualRight(true));
    private readonly releaseRight = (): void => this.withKeyboardInput(input => input.setVirtualRight(false));
    private readonly pressDown = (): void => this.withKeyboardInput(input => input.setVirtualDown(true));
    private readonly releaseDown = (): void => this.withKeyboardInput(input => input.setVirtualDown(false));
    private readonly pressJump = (): void => this.withKeyboardInput(input => input.setVirtualJump(true));
    private readonly releaseJump = (): void => this.withKeyboardInput(input => input.setVirtualJump(false));
    private readonly cancelJump = (): void => this.withKeyboardInput(input => input.cancelVirtualJump());
    private readonly pressAttack = (): void => this.withKeyboardInput(input => input.pressVirtualAttack());

    private readonly releaseVirtualInput = (): void => {
        this.withKeyboardInput(input => input.clearVirtualInput());
    };

    private withKeyboardInput(action: (input: KeyboardInput) => void): void {
        if (this.keyboardInput && isValid(this.keyboardInput)) {
            action(this.keyboardInput);
        }
    }
}
