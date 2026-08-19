import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact } from 'cc';

const { ccclass, requireComponent } = _decorator;

/** Tracks every collider currently overlapping the player's foot sensor. */
@ccclass('GroundSensor')
@requireComponent(Collider2D)
export class GroundSensor extends Component {
    private readonly groundContacts = new Set<Collider2D>();
    private sensor: Collider2D | null = null;

    public get isGrounded(): boolean {
        return this.groundContacts.size > 0;
    }

    protected onEnable(): void {
        this.sensor = this.getComponent(Collider2D);
        this.sensor?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        this.sensor?.on(Contact2DType.END_CONTACT, this.onEndContact, this);
    }

    protected onDisable(): void {
        this.removeListeners();
        this.groundContacts.clear();
    }

    protected onDestroy(): void {
        this.removeListeners();
        this.groundContacts.clear();
    }

    private onBeginContact(
        _selfCollider: Collider2D,
        otherCollider: Collider2D,
        _contact: IPhysics2DContact | null,
    ): void {
        this.groundContacts.add(otherCollider);
    }

    private onEndContact(
        _selfCollider: Collider2D,
        otherCollider: Collider2D,
        _contact: IPhysics2DContact | null,
    ): void {
        this.groundContacts.delete(otherCollider);
    }

    private removeListeners(): void {
        this.sensor?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        this.sensor?.off(Contact2DType.END_CONTACT, this.onEndContact, this);
        this.sensor = null;
    }
}
