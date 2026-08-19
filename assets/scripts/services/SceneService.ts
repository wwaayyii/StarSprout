import { director } from 'cc';

/**
 * Centralizes scene changes and ignores duplicate requests while a scene is
 * loading. This class intentionally has no Cocos component lifecycle because
 * it is used as a stateless service by scene components.
 */
export class SceneService {
    private static isLoading = false;

    /**
     * Loads a scene once. Returns false when the request is empty, redundant,
     * or another scene transition is already in progress.
     */
    public static load(sceneName: string): boolean {
        const normalizedName = sceneName.trim();

        if (
            normalizedName.length === 0
            || SceneService.isLoading
            || director.getScene()?.name === normalizedName
        ) {
            return false;
        }

        SceneService.isLoading = true;

        const accepted = director.loadScene(normalizedName, (error) => {
            SceneService.isLoading = false;

            if (error) {
                console.error(`[SceneService] Failed to load scene "${normalizedName}".`, error);
            }
        });

        if (!accepted) {
            SceneService.isLoading = false;
            console.error(`[SceneService] Scene "${normalizedName}" is unavailable.`);
        }

        return accepted;
    }
}
