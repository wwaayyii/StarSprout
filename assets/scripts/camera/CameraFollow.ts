import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

/** Smoothly follows a target horizontally while preserving the camera's starting height. */
@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property({ type: Node, tooltip: 'Node for the camera to follow, usually Player.' })
    public target: Node | null = null;

    @property({ tooltip: 'Horizontal world-space offset from the target.' })
    public horizontalOffset = 0;

    @property({ tooltip: 'Approximate smoothing time in seconds. Set to 0 for immediate following.', min: 0 })
    public smoothTime = 0.2;

    @property({ tooltip: 'Minimum camera X position in world space.' })
    public minX = -10000;

    @property({ tooltip: 'Maximum camera X position in world space.' })
    public maxX = 10000;

    private initialWorldY = 0;
    private initialWorldZ = 0;

    protected onEnable(): void {
        const worldPosition = this.node.worldPosition;
        this.initialWorldY = worldPosition.y;
        this.initialWorldZ = worldPosition.z;
    }

    protected lateUpdate(deltaTime: number): void {
        if (!this.target) {
            return;
        }

        const lowerBound = Math.min(this.minX, this.maxX);
        const upperBound = Math.max(this.minX, this.maxX);
        const desiredX = this.clamp(
            this.target.worldPosition.x + this.horizontalOffset,
            lowerBound,
            upperBound,
        );
        const currentX = this.node.worldPosition.x;
        const smoothing = this.smoothTime <= 0
            ? 1
            : 1 - Math.exp(-Math.max(deltaTime, 0) / this.smoothTime);
        const nextX = this.clamp(
            currentX + (desiredX - currentX) * smoothing,
            lowerBound,
            upperBound,
        );

        this.node.setWorldPosition(nextX, this.initialWorldY, this.initialWorldZ);
    }

    private clamp(value: number, minimum: number, maximum: number): number {
        return Math.min(Math.max(value, minimum), maximum);
    }
}
