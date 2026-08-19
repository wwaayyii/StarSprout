import { _decorator, Component } from 'cc';
import { SceneService } from '../services/SceneService';

const { ccclass } = _decorator;

@ccclass('StartView')
export class StartView extends Component {
    /** Called by the Start button's Click Events entry. */
    public startGame(): void {
        SceneService.load('TestLevel');
    }
}
