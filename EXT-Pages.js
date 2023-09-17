Module.register('EXT-Pages', {
  /**
   * This version use animateCSS of MM² v2.25.0
   */
  requiresVersion: "2.25.0",

  /**
   * By default, we have don't pseudo-paginate any modules. We also exclude
   * the page indicator by default, in case people actually want to use the
   * sister module. We also don't rotate out modules by default.
   */
  defaults: {
    debug: false,

    pages: {},
    fixed: [],
    hiddenPages: {},

    rotationTime: 0,
    rotationTimes: {},
    animationTime: 1000,

    homePage: 0,
    indicator: true,
    hideBeforeRotation: false,
    loading: "loading.png",
    Gateway: {}
  },

  /**
   * Apply any styles, if we have any.
   */
  getStyles: function() {
    return [
      "font-awesome.css",
      "EXT-Pages.css"
    ]
  },

  /**
   * Modulo that also works with negative numbers.
   *
   * @param {number} x The dividend
   * @param {number} n The divisor
   */
  mod: function (x, n) {
    return ((x % n) + n) % n
  },

  /**
   * Pseudo-constructor for our module. Makes sure that values aren't negative,
   * and sets the default current page to 0.
   */
  start: function () {
    logPages = (...args) => { /* do nothing */ }
    if (this.config.debug) logPages = (...args) => { console.log("[PAGES]", ...args) }
    this.timer = null
    // Clamp homePage value to [0, num pages).
    if (this.config.homePage >= Object.keys(this.config.pages).length || this.config.homePage < 0) {
      this.config.homePage = 0
    }
    this.checkPagesConfig()
    this.curPage = this.config.homePage
    this.rotationPaused = false
    this.isInHiddenPage= false
    this.locked = false
    this.ready = false

    // Disable rotation if an invalid input is given
    this.config.rotationTime = Math.max(this.config.rotationTime, 0)

    if (Object.keys(this.config.rotationTimes).length) {
      for (let i = 0; i < Object.keys(this.config.rotationTimes).length; i += 1) {
        this.config.rotationTimes[i]= Math.max(this.config.rotationTimes[i], 0)
      }
    }
  },

  getDom: function() {
    const wrapper = document.createElement('div')
    if (!this.config.indicator) {
      wrapper.style.display = 'none'
      return wrapper
    }
    for (let i = 0; i < Object.keys(this.config.pages).length; i += 1) {
      const circle = document.createElement('i')
      if (this.curPage === i && !this.isInHiddenPage) {
        circle.className = 'fa fa-circle indicator bright'
      } else {
        circle.className = 'fa fa-circle-thin indicator dimmed'
      }
      wrapper.appendChild(circle)

      circle.onclick = () => {
        this.notificationReceived('EXT_PAGES-CHANGED', i)
        if (!this.locked) this.curPage = i
      }
    }

    return wrapper
  },

  /**
   * Handles incoming notifications. Responds to the following:
   *   'DOM_OBJECTS_CREATED' - Starts the module.
   *   'EXT_PAGES-CHANGED' - Set the page to the specified payload page.
   *   'EXT_PAGES-INCREMENT' - Move to the next page.
   *   'EXT_PAGES-DECREMENT' - Move to the previous page.
   *   'EXT_PAGES-NUMBER' - Requests the current page number and total pages created
   *   'EXT_PAGES-PAUSE' - Stops rotation
   *   'EXT_PAGES-RESUME' - Resumes rotation
   *   'EXT_PAGES-HOME' - Calls EXT_PAGES-CHANGED with the default home page.
   *   'EXT_PAGES-HIDDEN_SHOW' - Shows the (in the payload) specified hidden
   *                        page by name
   *   'EXT_PAGES-HIDDEN_LEAVE' - Hides the currently showing hidden page and
   *                         resumes showing the last page
   *
   * @param {string} notification the notification ID
   * @param {number|string} payload the page to change to/by
   */
  notificationReceived: function (notification, payload, sender) {
    if (notification == "MODULE_DOM_CREATED") {
      this.HideAllModules()
    }
    if (notification == "GW_READY" && sender.name == "Gateway") {
      this.sendSocketNotification("INIT")
      logPages('received that all objects are created; will now hide things!')
      this.Loaded()
      this.animatePageChange()
      this.resetTimerWithDelay(0)
      this.ready = true
      this.sendNotification("EXT_HELLO", this.name)
      this.sendNotification('EXT_PAGES-NUMBER_IS', {
        Actual: this.curPage,
        Total: Object.keys(this.config.pages).length
      })
    }
    if (!this.ready) return

    switch (notification) {
      case 'EXT_PAGES-CHANGED':
        logPages(`Received a notification to change to page ${payload}`)

        if (this.locked && (!sender || sender.name != "Gateway")) {
          this.sendNotification("EXT_ALERT", {
            message: "Error: EXT-PAGES is locked by Gateway!",
            type: "error"
          })
          return
        }

        // assume: `payload = 0` is an empty object {}
        if (!payload || (typeof payload == "object" && !Object.keys(payload).length)) payload = 0
        if (payload && isNaN(payload)) {
          this.sendNotification("EXT_ALERT", {
            message: "Error: EXT_PAGES-CHANGED must have an number value",
            type: "error"
          })
          return
        }
        payload = parseInt(payload)
        if (payload >= Object.keys(this.config.pages).length || payload < 0) {
          return this.sendNotification("EXT_ALERT", {
            message: "Error: This page don't exist: " + payload,
            type: "error"
          })
        }
        this.curPage = payload
        if (this.isInHiddenPage) {
          this.isInHiddenPage= false
          this.setRotation(true)
        }
        this.updatePages()
        break
      case "EXT_PAGES-LOCK":
        if (sender.name == "Gateway") {
          if (this.locked) return
          logPages('Received a lock notification!')
          this.setRotation(false)
          this.locked = true
        }
        break
      case "EXT_PAGES-UNLOCK":
        if (sender.name == "Gateway") { // unforce anyway
          logPages('Received an unlock notification!')
          this.setRotation(true)
          this.locked = false
        }
        break
      case 'EXT_PAGES-INCREMENT':
        if (this.locked) return
        logPages('Received a notification to increment pages!')
        if (this.isInHiddenPage) {
          this.isInHiddenPage= false
          this.setRotation(true)
        }
        this.changePageBy(payload, 1)
        this.updatePages()
        break
      case 'EXT_PAGES-DECREMENT':
        if (this.locked) return
        logPages('Received a notification to decrement pages!')
        if (this.isInHiddenPage) {
          this.isInHiddenPage= false
          this.setRotation(true)
        }
        // We can't just pass in -payload for situations where payload is null
        // JS will coerce -payload to -0.
        this.changePageBy(payload ? -payload : payload, -1)
        this.updatePages()
        break
      case 'EXT_PAGES-NUMBER':
        this.sendNotification('EXT-PAGES_NUMBER_IS', {
          Actual: this.curPage,
          Total: Object.keys(this.config.pages).length
        })
        break
      case 'EXT_PAGES-PAUSE':
        if (this.locked) return
        this.setRotation(false)
        break
      case 'EXT_PAGES-RESUME':
        if (this.locked) return
        this.setRotation(true)
        break
      case 'EXT_PAGES-HOME':
        this.notificationReceived('EXT_PAGES-CHANGED', this.config.homePage)
        break
      case 'EXT_PAGES-HIDDEN_SHOW':
        logPages(`Received a notification to change to the hidden page "${payload}"`)
        if (this.locked) return
        this.setRotation(false)
        this.showHiddenPage(payload)
        break
      case 'EXT_PAGES-HIDDEN_LEAVE':
        logPages("Received a notification to leave the current hidden page ")
        if (this.locked) return
        if (this.isInHiddenPage) {
          this.isInHiddenPage= false
          this.setRotation(true)
        }
        this.animatePageChange()
        break
      case "EXT_PAGES-Gateway":
        if (sender.name == "Gateway") this.sendNotification("EXT_PAGES-Gateway", this.config.Gateway)
        break
      default: // Do nothing
    }
  },

  /**
   * Changes the internal page number by the specified amount. If the provided
   * amount is invalid, use the fallback amount. If the fallback amount is
   * missing or invalid, do nothing.
   *
   * @param {number} amt the amount of pages to move forward by. Accepts
   * negative numbers.
   * @param {number} fallback the fallback value to use. Accepts negative
   * numbers.
   */
  changePageBy: function (amt, fallback) {
    if (typeof amt !== 'number' && typeof fallback === 'undefined') {
      console.error(`[Pages]: ${amt} is not a number!`)
    }

    if (typeof amt === 'number' && !Number.isNaN(amt)) {
      this.curPage = this.mod(
        this.curPage + amt,
        Object.keys(this.config.pages).length
      )
    } else if (typeof fallback === 'number') {
      this.curPage = this.mod(
        this.curPage + fallback,
        Object.keys(this.config.pages).length
      )
    }
  },

  /**
   * Handles hiding the current page's elements and showing the next page's
   * elements.
   */
  updatePages: function () {
    // Update iff there's at least one page.
    if (Object.keys(this.config.pages).length !== 0) {
      this.animatePageChange()
      if (!this.rotationPaused) this.resetTimerWithDelay(0)
      this.sendNotification('EXT_PAGES-NUMBER_IS', {
        Actual: this.curPage,
        Total: Object.keys(this.config.pages).length
      })
    } else {
      this.sendNotification("EXT_ALERT", {
        message: "Error: Pages aren't properly defined!",
        type: "error"
      })
      Log.error("[Pages]: Pages aren't properly defined!")
    }
  },

  /**
   * Animates the page change from the previous page to the current one. This
   * assumes that there is a discrepancy between the page currently being shown
   * and the page that is meant to be shown.
   *
   * @param {string} [targetPageName] the name of the hiddenPage we want to show.
   * Optional and only used when we want to switch to a hidden page
   */
  animatePageChange: function (targetPageName) {
    let lockStringObj = { lockString: "EXT-Pages-Locked" }

    // Hides all modules not on the current page. This hides any module not
    // meant to be shown.

    let modulesToShow
    if (typeof targetPageName !== 'undefined') {
      modulesToShow = this.config.hiddenPages[targetPageName]
    } else {
      if (!this.config.pages[this.curPage]) {
        this.sendNotification("EXT_ALERT", {
          message: "Error: Page " + this.curPage + " not found!",
          type: "error"
        })
        modulesToShow = this.config.fixed
      }
      else modulesToShow = this.config.fixed.concat(this.config.pages[this.curPage])
    }

    const animationTime = this.config.animationTime / 2

    if (this.config.hideBeforeRotation) {
      MM.getModules()
        .exceptModule(this)
        .enumerate(module => {
          if (!module.hidden) module.hide(animationTime, () => {}, lockStringObj)
        })
    } else {
      MM.getModules()
        .exceptModule(this)
        .exceptWithClass(modulesToShow)
        .enumerate(module => {
          if (!module.hidden) module.hide(animationTime, () => {}, lockStringObj)
        })
    }
    if (this.config.indicator) this.updateDom()

    // Shows all modules meant to be on the current page, after a small delay.
    setTimeout(() => {
      MM.getModules()
        .exceptModule(this)
        .withClass(modulesToShow)
        .enumerate(module => {
          if (module.hidden) module.show(animationTime, () => {}, lockStringObj)
        })
    }, this.config.animationTime)
  },

  /** Hide All modules **/
  HideAllModules: function () {
    let lockStringObj = { lockString: "EXT-Pages-Locked" }
    MM.getModules()
      .exceptModule(this)
      .enumerate(module => {
        if (!module.hidden) module.hide(0, () => {}, lockStringObj)
      })
    this.Loading()
  },

  /** display loaging images **/
  Loading: function () {
    let Pages = document.createElement("div")
    Pages.id = "EXT_PAGES"
    let Waiting = document.createElement("img")
    Waiting.id = "EXT_PAGES-Loading"
    Waiting.src= "/modules/EXT-Pages/loading/" + this.config.loading
    Waiting.onerror= () => {
      Waiting.src= "/modules/EXT-Pages/loading/loading.png"
      this.sendNotification("EXT_ALERT", {
        message: `Error: Loading picture ${this.config.loading} !`,
        type: "warn"
      })
    }
    Pages.appendChild(Waiting)
    document.body.appendChild(Pages)
    addAnimateCSS("EXT_PAGES", "rotateIn" , 1)
  },

  /** It's Loaded, hide loading page **/
  Loaded: function () {
    let Waiting = document.getElementById("EXT_PAGES")
    Waiting.classList.add("hidden")
    removeAnimateCSS("EXT_PAGES", "rotateIn")
  },

  /**
   * Resets the page changing timer with a delay.
   *
   * @param {number} delay the delay, in milliseconds.
   */
  resetTimerWithDelay: function (delay) {
    let rotationTime = this.config.rotationTimes[this.curPage] ? this.config.rotationTimes[this.curPage] : this.config.rotationTime
    if (rotationTime > 0) {
      clearInterval(this.timer)
      this.timer = setInterval(() => {
        this.notificationReceived('EXT_PAGES-INCREMENT')
      }, rotationTime+this.config.animationTime)
    }
  },

  /**
   * Pause or resume the page rotation. If the provided isRotating value is
   * set to true, it will resume the rotation. If the requested
   * state (f.e. isRotating === true) equals the current state, print a warning
   * and do nothing.
   *
   * @param {boolean} isRotating the parameter, if you want to pause or resume.
   */
  setRotation: function (isRotating) {
    const stateBaseString = (isRotating) ? "resum" : "paus"
    if (isRotating === !this.rotationPaused) {
      console.warn(`[Pages]: Was asked to ${stateBaseString}e but rotation is already ${stateBaseString}ed!`)
    } else {
      logPages(`${stateBaseString}ing rotation`)
      if (!isRotating) clearInterval(this.timer)
      else this.resetTimerWithDelay()
      this.rotationPaused = !isRotating
    }
  },

  /**
   * Handles hidden pages.
   *
   * @param {string} name the name of the hiddenPage we want to show
   */
  showHiddenPage: function (name) {
    // Only proceed if the named hidden page actually exists
    if (name in this.config.hiddenPages) {
      this.isInHiddenPage= true
      this.animatePageChange(name)
    } else {
      console.error(`[Pages] Hidden page "${name}" does not exist!`)
      this.sendNotification("EXT_ALERT", {
        message: `Error: Hidden page "${name}" does not exist!`,
        type: "error"
      })
    }
  },

  checkPagesConfig: function() {
    if (Object.keys(this.config.pages).length) {
      for (let i = 0; i < Object.keys(this.config.pages).length; i += 1) {
        if (!this.config.pages[i]) {
          Log.error("[Pages] Page " + i + " is undefined")
          this.sendNotification("EXT_ALERT", {
            message: "Error: Page " + i + " is undefined",
            type: "error"
          })
        }
      }
    }
  },

  EXT_TELBOTCommands: function(commander) {
    commander.add({
      command: "pages",
      description: "Change page number",
      callback: "tbPages"
    })
    if (Object.keys(this.config.hiddenPages).length) {
      commander.add({
        command: "hidden",
        description: "Choose an hidden page",
        callback: "tbHiddenPages"
      })
    }
  },

  tbPages: function(command, handler) {
    if (handler.args) {
      var args = handler.args.split(" ")
      if (args[0] && !isNaN(args[0])) {
        if (args[0] >= Object.keys(this.config.pages).length) {
          return handler.reply("TEXT", "Page not found: " + args[0])
        }
        handler.reply("TEXT", "Change page number to " + args[0])
        return this.notificationReceived("EXT_PAGES-CHANGED", parseInt(args[0]))
      } else {
        return handler.reply("TEXT", "invalid number page!")
      }
    }
    handler.reply("TEXT", "/pages <page number>")
  },

  tbHiddenPages: function(command, handler) {
    if (handler.args) {
      var args = handler.args.split(" ")
      if (args[0] && args[0] in this.config.hiddenPages) {
        handler.reply("TEXT", "Change to hidden page: " + args[0])
        return this.notificationReceived("EXT_PAGES-HIDDEN_SHOW", args[0])
      } else {
        return handler.reply("TEXT", "invalid hidden page name!")
      }
    }
    let hiddenKey = " "
    for (const [key, value] of Object.entries(this.config.hiddenPages)) {
      hiddenKey += key + " "
    }
    handler.reply("TEXT", "/hidden <hidden page name>\nFrom config valid names:" + hiddenKey, {parse_mode:'Markdown'})
  }
});
