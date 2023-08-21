/** Vocal control for EXT-Pages **/
/**  modify pattern to your language  **/
/**  It's a sample: modify it and save it in another filename **/
/**  @bugsounet  **/
/** 21/08/2023 **/

var recipe = {
  transcriptionHooks: {
    "PAGEHOME": {
      pattern: "go to main page",
      command: "PAGEHOME"
    },
    "PAGE1": {
      pattern: "go to page 1",
      command: "PAGE1"
    },
    "PAGE2": {
      pattern: "go to page 2",
      command: "PAGE2"
    },
    "ADMIN": {
      pattern: "go to admin",
      command: "PAGEADMIN"
    }
  },
  commands: {
    "PAGEHOME": {
      notificationExec: {
        notification: "EXT_PAGES-HOME"
      }
    },
    "PAGE1": {
      notificationExec: {
        notification: "EXT_PAGES-CHANGED",
        payload: 1
      }
    },
    "PAGE2": {
      notificationExec: {
        notification: "EXT_PAGES-CHANGED",
        payload: 2
      }
    },
    "PAGEADMIN": {
      notificationExec: {
        notification: "EXT_PAGES-HIDDEN_SHOW",
        payload: "admin"
      }
    }
  }
}
exports.recipe = recipe // Don't remove this line.
