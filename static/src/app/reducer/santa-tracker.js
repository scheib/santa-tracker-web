import {SantaTrackerAction} from '../action.js';

export const santaTrackerReducer = (state, action) => {
  switch (action.type) {
    case SantaTrackerAction.SCENE_DATA:
      return {
        ...state,
        selectedData: action.payload,
      };

    case SantaTrackerAction.SCENE_SELECTED:
      const {sceneName, data} = action.payload;
      if (state.selectedScene === sceneName) {
        // hide sidebar if we're already selected (pretend 'activated' again)
        let showSidebar = state.showSidebar;
        if (state.activeScene === sceneName) {
          showSidebar = false;
        }

        return {
          ...state,
          selectedData: data || state.selectedData,  // use new if provided
          showSidebar,
          loadAttempt: state.loadAttempt + 1,  // might request reload
        };
      }

      // if the selected scene is already active (but not selected), then it was selected again
      // during another scene's load: so set the scene's loadProgress to done!
      const loadProgress = (state.activeScene === sceneName) ? 1 : 0;
      return {
        ...state,
        selectedScene: sceneName,
        selectedData: data,
        loadAttempt: 0,
        loadProgress,
      };

    case SantaTrackerAction.SCENE_LOAD_PROGRESS:
      if (state.activeScene === state.selectedScene) {
        return state;  // can arrive out-of-order, ignore if scene happy
      }
      return {...state, loadProgress: action.payload};

    case SantaTrackerAction.SCENE_ACTIVATED:
      return {
        ...state,
        ready: true,
        activeScene: action.payload,
        loadProgress: 1,
        restartCount: 0,
        showError: false,
        showSidebar: false,
        score: {},
        gameover: false,
        shareUrl: false,
      };

    case SantaTrackerAction.SCENE_FAILED:
      // nb. selectedScene remains the same, as the URL should not change.
      return {
        ...state,
        activeScene: null,
        loadProgress: 1,
        showError: action.payload || true,
        showSidebar: false,
        gameover: false,
        shareUrl: false,
      };

    case SantaTrackerAction.SCENE_RESTART:
      return {
        ...state,
        gameover: false,
        shareUrl: false,
      };

    case SantaTrackerAction.SCORE_GAMEOVER:
      return {
        ...state,
        score: {score: action.payload.score},
        gameover: true,
        shareUrl: 'url' in action.payload,
      };

    case SantaTrackerAction.SCORE_UPDATE:
      return {...state, score: action.payload};

    case SantaTrackerAction.PAGE_BECAME_VISIBLE:
      return {...state, pageVisible: true};

    case SantaTrackerAction.PAGE_BECAME_HIDDEN:
      return {...state, pageVisible: false};

    case SantaTrackerAction.DEVICE_WENT_ONLINE:
      return {...state, online: true};

    case SantaTrackerAction.DEVICE_WENT_OFFLINE:
      return {...state, online: false};

    case SantaTrackerAction.API_SYNC_COMPLETED:
      return {...state, api: action.payload};

    case SantaTrackerAction.SIDEBAR_REQUESTED:
      return {...state, showSidebar: true};

    case SantaTrackerAction.SIDEBAR_DISMISSED:
      return {...state, showSidebar: false};
  }

  return state;
};