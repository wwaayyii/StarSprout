import { _decorator, Component, RigidBody2D, Vec2 } from 'cc';
import { KeyboardInput } from '../input/KeyboardInput';
import { GroundSensor } from './GroundSensor';

const { ccclass, property, requireComponent } = _decorator;

/** Drives a simple physics-based greybox player. */
@ccclass('PlayerMotor')
@requireComponent(RigidBody2D)
export class PlayerMotor extends Component {
    @property({ type: KeyboardInput, tooltip: 'KeyboardInput on the Player node.' })
    public keyboardInput: KeyboardInput | null = null;

    @property({ type: GroundSensor, tooltip: 'GroundSensor on the foot sensor child.' })
    public groundSensor: GroundSensor | null = null;

    @property({ tooltip: 'Maximum horizontal speed in pixels per second.' })
    public maxMoveSpeed = 260;

    @property({ tooltip: 'Ground acceleration in pixels per second squared.' })
    public groundAcceleration = 1800;

    @property({ tooltip: 'Air acceleration in pixels per second squared.' })
    public airAcceleration = 900;

    @property({ tooltip: 'Horizontal deceleration in pixels per second squared.' })
    public deceleration = 2200;

    @property({ tooltip: 'Upward speed applied by a grounded jump.' })
    public jumpSpeed = 620;

    @property({ tooltip: 'Gravity multiplier used by RigidBody2D.' })
    public gravityScale = 2;

    private body: RigidBody2D | null = null;
    private facingSign = 1;
    private baseScaleX = 1;

    protected onLoad(): void {
        this.body = this.getComponent(RigidBody2D);
        this.baseScaleX = Math.abs(this.node.scale.x) || 1;
        this.facingSign = this.node.scale.x < 0 ? -1 : 1;

        if (this.body) {
            this.body.gravityScale = this.gravityScale;
        }
    }

    protected update(deltaTime: number): void {
        if (!this.body || !this.keyboardInput || !this.groundSensor) {
            return;
        }

        this.body.gravityScale = this.gravityScale;

        const velocity = this.body.linearVelocity;
        const direction = this.keyboardInput.horizontal;
        const targetSpeed = direction * this.maxMoveSpeed;
        const rate = direction === 0
            ? this.deceleration
            : (this.groundSensor.isGrounded ? this.groundAcceleration : this.airAcceleration);
        const nextX = this.moveTowards(velocity.x, targetSpeed, rate * deltaTime);
        let nextY = velocity.y;

        if (this.keyboardInput.consumeJumpPressed() && this.groundSensor.isGrounded) {
            nextY = this.jumpSpeed;
        }

        this.body.linearVelocity = new Vec2(nextX, nextY);

        if (direction !== 0 && direction !== this.facingSign) {
            this.facingSign = direction;
            this.node.setScale(
                this.baseScaleX * this.facingSign,
                this.node.scale.y,
                this.node.scale.z,
            );
        }
    }

    private moveTowards(current: number, target: number, maxDelta: number): number {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }

        return current + Math.sign(target - current) * maxDelta;
    }
}
