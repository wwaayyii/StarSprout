import { _decorator, Component, Node, RigidBody2D, Vec2 } from 'cc';
import { KeyboardInput } from '../input/KeyboardInput';
import { GroundSensor } from './GroundSensor';

const { ccclass, property, requireComponent } = _decorator;

/** Drives a simple physics-based greybox player. */
@ccclass('PlayerMotor')
@requireComponent(RigidBody2D)
export class PlayerMotor extends Component {
    @property({ type: KeyboardInput, tooltip: 'KeyboardInput on the Player node.' })
    public keyboardInput: KeyboardInput | null = null;

    @property({ type: GroundSensor, tooltip: 'GroundSensor on the GroundProbe child.' })
    public groundSensor: GroundSensor | null = null;

    @property({ type: Node, tooltip: 'Visual child to flip without scaling the physics root.' })
    public visualRoot: Node | null = null;

    @property({ tooltip: 'Maximum horizontal speed in physics world units per second.' })
    public maxMoveSpeed = 5;

    @property({ tooltip: 'Ground acceleration in physics world units per second squared.' })
    public groundAcceleration = 35;

    @property({ tooltip: 'Air acceleration in physics world units per second squared.' })
    public airAcceleration = 12;

    @property({ tooltip: 'Horizontal deceleration in physics world units per second squared.' })
    public deceleration = 45;

    @property({ tooltip: 'Upward speed applied by a grounded jump, in physics world units per second.' })
    public jumpSpeed = 15;

    @property({ tooltip: 'Gravity multiplier used by RigidBody2D.' })
    public gravityScale = 3;

    @property({ min: 0, tooltip: 'Seconds during which one-way platform contacts are ignored.' })
    public dropThroughDuration = 0.25;

    @property({ min: 0, tooltip: 'Initial downward speed used to leave a one-way platform.' })
    public dropThroughSpeed = 2;

    private body: RigidBody2D | null = null;
    private facingSign = 1;
    private baseScaleX = 1;
    private dropThroughTimeRemaining = 0;

    /** Whether one-way platforms should currently let this player pass downward. */
    public get isDroppingThroughPlatform(): boolean {
        return this.dropThroughTimeRemaining > 0;
    }

    protected onLoad(): void {
        this.body = this.getComponent(RigidBody2D);
        if (this.visualRoot) {
            this.baseScaleX = Math.abs(this.visualRoot.scale.x) || 1;
            this.facingSign = this.visualRoot.scale.x < 0 ? -1 : 1;
        }

        if (this.body) {
            this.body.gravityScale = this.gravityScale;
        }
    }

    protected update(deltaTime: number): void {
        this.dropThroughTimeRemaining = Math.max(
            0,
            this.dropThroughTimeRemaining - deltaTime,
        );

        if (!this.body || !this.keyboardInput || !this.groundSensor) {
            return;
        }

        this.body.gravityScale = this.gravityScale;

        const velocity = this.body.linearVelocity;
        const grounded = this.groundSensor.isGrounded;
        const direction = this.keyboardInput.horizontal;
        const targetSpeed = direction * this.maxMoveSpeed;
        const rate = direction === 0
            ? this.deceleration
            : (grounded ? this.groundAcceleration : this.airAcceleration);
        const nextX = this.moveTowards(velocity.x, targetSpeed, rate * deltaTime);
        let nextY = velocity.y;

        if (this.keyboardInput.consumeJumpPressed() && grounded) {
            if (this.keyboardInput.downHeld) {
                this.dropThroughTimeRemaining = this.dropThroughDuration;
                nextY = -this.dropThroughSpeed;
            } else {
                nextY = this.jumpSpeed;
            }
        }

        this.body.linearVelocity = new Vec2(nextX, nextY);

        if (this.visualRoot && direction !== 0 && direction !== this.facingSign) {
            this.facingSign = direction;
            this.visualRoot.setScale(
                this.baseScaleX * this.facingSign,
                this.visualRoot.scale.y,
                this.visualRoot.scale.z,
            );
        }
    }

    protected onDisable(): void {
        this.dropThroughTimeRemaining = 0;
    }

    protected onDestroy(): void {
        this.dropThroughTimeRemaining = 0;
    }

    private moveTowards(current: number, target: number, maxDelta: number): number {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }

        return current + Math.sign(target - current) * maxDelta;
    }
}
