import {
    _decorator,
    Collider2D,
    Component,
    ERaycast2DType,
    Node,
    PhysicsSystem2D,
    Vec2,
} from 'cc';

const { ccclass, property } = _decorator;

/** Detects ground below this probe with three short downward raycasts. */
@ccclass('GroundSensor')
export class GroundSensor extends Component {
    @property({ tooltip: 'Collision mask used by the ground raycasts.' })
    public groundMask = 0xffffffff;

    @property({ min: 0, tooltip: 'Downward ray length in pixels.' })
    public rayDistance = 10;

    @property({ min: 0, tooltip: 'Horizontal offset of the left and right rays in pixels.' })
    public probeHalfWidth = 16;

    /** Performs a current physics query instead of relying on contact callbacks. */
    public get isGrounded(): boolean {
        const origin = this.node.worldPosition;
        const offsets = [-this.probeHalfWidth, 0, this.probeHalfWidth];

        for (const offset of offsets) {
            const start = new Vec2(origin.x + offset, origin.y);
            const end = new Vec2(start.x, start.y - this.rayDistance);
            const results = PhysicsSystem2D.instance.raycast(
                start,
                end,
                ERaycast2DType.All,
                this.groundMask,
            );

            if (results.some((result) => this.isValidGround(result.collider))) {
                return true;
            }
        }

        return false;
    }

    private isValidGround(collider: Collider2D): boolean {
        if (collider.sensor) {
            return false;
        }

        const playerRoot = this.node.parent ?? this.node;
        return !this.isNodeInPlayerHierarchy(collider.node, playerRoot);
    }

    private isNodeInPlayerHierarchy(node: Node, playerRoot: Node): boolean {
        let current: Node | null = node;

        while (current) {
            if (current === playerRoot) {
                return true;
            }
            current = current.parent;
        }

        return false;
    }
}
