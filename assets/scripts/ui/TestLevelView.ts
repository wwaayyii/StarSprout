import { _decorator, Component } from 'cc';
import { SceneService } from '../services/SceneService';

const { ccclass } = _decorator;

@ccclass('TestLevelView')
export class TestLevelView extends Component {
    /** Called by the Return button's Click Events entry. */
    public returnToStart(): void {
        SceneService.load('Start');
    }
}
