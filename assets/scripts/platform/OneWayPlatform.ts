import {
    _decorator,
    BoxCollider2D,
    Collider2D,
    Component,
    Contact2DType,
    ERigidBody2DType,
    IPhysics2DContact,
    Node,
    RigidBody2D,
} from 'cc';
import { PlayerMotor } from '../player/PlayerMotor';

const { ccclass, property, requireComponent } = _decorator;

/** Makes a solid box behave as a one-way platform for dynamic players. */
@ccclass('OneWayPlatform')
@requireComponent(BoxCollider2D)
export class OneWayPlatform extends Component {
    @property({
        min: 0,
        tooltip: 'Upward speeds above this value pass through the platform (physics units/second).',
    })
    public upwardVelocityTolerance = 0.1;

    @property({
        min: 0,
        tooltip: 'Allowed distance below the top surface before contact is disabled (pixels).',
    })
    public surfaceTolerance = 2;

    private platformCollider: BoxCollider2D | null = null;

    protected onLoad(): void {
        this.platformCollider = this.getComponent(BoxCollider2D);
    }

    protected onEnable(): void {
        const collider = this.getPlatformCollider();
        collider?.on(Contact2DType.PRE_SOLVE, this.onPreSolve, this);
    }

    protected onDisable(): void {
        this.platformCollider?.off(Contact2DType.PRE_SOLVE, this.onPreSolve, this);
    }

    protected onDestroy(): void {
        this.platformCollider?.off(Contact2DType.PRE_SOLVE, this.onPreSolve, this);
        this.platformCollider = null;
    }

    private onPreSolve(
        _selfCollider: Collider2D,
        otherCollider: Collider2D,
        contact: IPhysics2DContact | null,
    ): void {
        if (!contact || !otherCollider) {
            return;
        }

        const platformCollider = this.getPlatformCollider();
        const playerBody = this.getDynamicPlayerBody(otherCollider);
        if (!platformCollider || !playerBody) {
            return;
        }

        const isMovingUp = playerBody.linearVelocity.y > this.upwardVelocityTolerance;
        const playerFeet = otherCollider.worldAABB.yMin;
        const platformTop = platformCollider.worldAABB.yMax;
        const isBelowSurface = playerFeet < platformTop - this.surfaceTolerance;

        // disabledOnce affects only this physics step, so a falling player can land later.
        contact.disabledOnce = isMovingUp || isBelowSurface;
    }

    private getPlatformCollider(): BoxCollider2D | null {
        if (!this.platformCollider?.isValid) {
            this.platformCollider = this.getComponent(BoxCollider2D);
        }
        return this.platformCollider;
    }

    private getDynamicPlayerBody(collider: Collider2D): RigidBody2D | null {
        if (!this.findPlayerMotor(collider.node)) {
            return null;
        }

        const body = collider.body;
        return body?.type === ERigidBody2DType.Dynamic ? body : null;
    }

    private findPlayerMotor(node: Node): PlayerMotor | null {
        let current: Node | null = node;
        while (current) {
            const motor = current.getComponent(PlayerMotor);
            if (motor) {
                return motor;
            }
            current = current.parent;
        }
        return null;
    }
}
