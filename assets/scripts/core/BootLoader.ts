import { _decorator, Component } from 'cc';
import { SceneService } from '../services/SceneService';

const { ccclass } = _decorator;

@ccclass('BootLoader')
export class BootLoader extends Component {
    protected start(): void {
        SceneService.load('Start');
    }
}
