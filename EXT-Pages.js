Module.register('EXT-Pages', {

  /**
   * By default, we have don't pseudo-paginate any modules. We also exclude
   * the page indicator by default, in case people actually want to use the
   * sister module. We also don't rotate out modules by default.
   */
  defaults: {
    animates: {},
    pages: {},
    fixed: [],
    hiddenPages: {},
    animationTime: 1000,
    rotationTime: 0,
    rotationHomePage: 0,
    rotationDelay: 10000,
    homePage: 0,
    useLockString: true,
    indicator: true,
    activeBright: false,
    inactiveDimmed: true,
    inactiveHollow: true,
  },

  /**
   * Apply any styles, if we have any.
   */
  getStyles: function() {
    return [
      "font-awesome.css",
      "EXT-Pages.css",
      "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
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
    // Clamp homePage value to [0, num pages).
    if (this.config.homePage >= Object.keys(this.config.pages).length || this.config.homePage < 0) {
      this.config.homePage = 0
    }
    this.checkPagesConfig()
    this.curPage = this.config.homePage
    this.rotationPaused = false
    this.isInHiddenPage= false

    // Disable rotation if an invalid input is given
    this.config.rotationTime = Math.max(this.config.rotationTime, 0)
    this.config.rotationDelay = Math.max(this.config.rotationDelay, 0)
    this.config.rotationHomePage = Math.max(this.config.rotationHomePage, 0)

    if (!this.config.useLockString) {
      Log.log('[Pages]: User opted to not use lock strings!')
    }

    this.animatePrefix = "animate__"

    this.animateStyle= {
      // Attention seekers
      1: "bounce",
      2: "flash",
      3: "pulse",
      4: "rubberBand",
      5: "shakeX",
      6: "shakeY",
      7: "headShake",
      8: "swing",
      9: "tada",
      10: "wobble",
      11: "jello",
      12: "heartBeat",
      // Back entrances
      13: "backInDown",
      14: "backInLeft",
      15: "backInRight",
      16: "backInUp",
      // Bouncing entrances
      17: "bounceIn",
      18: "bounceInDown",
      19: "bounceInLeft",
      20: "bounceInRight",
      21: "bounceInUp",
      // Fading entrances
      22: "fadeIn",
      23: "fadeInDown",
      24: "fadeInDownBig",
      25: "fadeInLeft",
      26: "fadeInLeftBig",
      27: "fadeInRight",
      28: "fadeInRightBig",
      29: "fadeInUp",
      30: "fadeInUpBig",
      31: "fadeInTopLeft",
      32: "fadeInTopRight",
      33: "fadeInBottomLeft",
      34: "fadeInBottomRight",
      // Flippers
      35: "flip",
      36: "flipInX",
      37: "flipInY",
      // Lightspeed
      38: "lightSpeedInRight",
      39: "lightSpeedInLeft",
      // Rotating entrances
      40: "rotateIn",
      41: "rotateInDownLeft",
      42: "rotateInDownRight",
      43: "rotateInUpLeft",
      44: "rotateInUpRight",
      // Specials
      45: "jackInTheBox",
      46: "rollIn",
      // Zooming entrances
      47: "zoomIn",
      48: "zoomInDown",
      49: "zoomInLeft",
      50: "zoomInRight",
      51: "zoomInUp",
      // Sliding entrances
      52: "slideInDown",
      53: "slideInLeft",
      54: "slideInRight",
      55: "slideInUp"
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
        circle.className = 'fa fa-circle indicator'
        if (this.config.activeBright) {
          circle.className += ' bright'
        }
      } else {
        circle.className = 'fa indicator'

        if (this.config.inactiveDimmed) {
          circle.className += ' dimmed'
        }

        if (this.config.inactiveHollow) {
          circle.className += ' fa-circle-thin'
        } else {
          circle.className += ' fa-circle'
        }
      }
      wrapper.appendChild(circle)

      // Lets people change the page by clicking on the respective circle.
      // So apparently this doesn't work if we don't call the last two methods,
      // despite those methods being called in when calling sendNotification.
      // This is likely a bug (because spamming a single button) causes rapid-
      // fire page changing, but for most cases that shouldn't be a problem.
      circle.onclick = () => {
        this.notificationReceived('PAGE_CHANGED', i)
        this.curPage = i
      }
    }

    return wrapper
  },

  /**
   * Handles incoming notifications. Responds to the following:
   *   'PAGE_CHANGED' - Set the page to the specified payload page.
   *   'PAGE_INCREMENT' - Move to the next page.
   *   'PAGE_DECREMENT' - Move to the previous page.
   *   'DOM_OBJECTS_CREATED' - Starts the module.
   *   'QUERY_PAGE_NUMBER' - Requests the current page number
   *   'PAUSE_ROTATION' - Stops rotation
   *   'RESUME_ROTATION' - Resumes rotation
   *   'HOME_PAGE' - Calls PAGED_CHANGED with the default home page.
   *   'SHOW_HIDDEN_PAGE' - Shows the (in the payload) specified hidden
   *                        page by name
   *   'LEAVE_HIDDEN_PAGE' - Hides the currently showing hidden page and
   *                         resumes showing the last page
   *
   * @param {string} notification the notification ID
   * @param {number|string} payload the page to change to/by
   */
  notificationReceived: function (notification, payload) {
    switch (notification) {
      case 'DOM_OBJECTS_CREATED':
        Log.log('[Pages]: received that all objects are created; will now hide things!')
        this.sendNotification('NEW_PAGE', this.curPage)
        this.animatePageChange()
        this.resetTimerWithDelay(0)
        break
      case 'PAGE_CHANGED':
        Log.log(`[Pages]: received a notification to change to page ${payload} of type ${typeof payload}`)
        this.curPage = payload
        if (this.isInHiddenPage) {
          this.isInHiddenPage= false
          this.setRotation(true)
        }
        this.updatePages()
        break
      case 'PAGE_INCREMENT':
        Log.log('[Pages]: received a notification to increment pages!')
        this.changePageBy(payload, 1)
        this.updatePages()
        break
      case 'PAGE_DECREMENT':
        Log.log('[Pages]: received a notification to decrement pages!')
        // We can't just pass in -payload for situations where payload is null
        // JS will coerce -payload to -0.
        this.changePageBy(payload ? -payload : payload, -1)
        this.updatePages()
        break
      case 'QUERY_PAGE_NUMBER':
        this.sendNotification('PAGE_NUMBER_IS', this.curPage)
        break
      case 'PAUSE_ROTATION':
        this.setRotation(false)
        break
      case 'RESUME_ROTATION':
        this.setRotation(true)
        break
      case 'HOME_PAGE':
        this.notificationReceived('PAGE_CHANGED', this.config.homePage)
        break
      case 'SHOW_HIDDEN_PAGE':
        Log.log(`[Pages]: received a notification to change to the hidden page "${payload}" of type "${typeof payload}"`)
        this.setRotation(false)
        this.showHiddenPage(payload)
        break
      case 'LEAVE_HIDDEN_PAGE':
        Log.log("[Pages]: received a notification to leave the current hidden page ")
        this.animatePageChange()
        this.setRotation(true)
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
      Log.warn(`[Pages]: ${amt} is not a number!`)
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
      this.sendNotification('NEW_PAGE', this.curPage)
    } else Log.error("[Pages]: Pages aren't properly defined!")
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
    if (!this.config.useLockString) {
      // Passing in an undefined object is equivalent to not passing it in at
      // all, effectively providing only one arg to the hide and show calls
      lockStringObj = undefined
    }

    // Hides all modules not on the current page. This hides any module not
    // meant to be shown.

    let modulesToShow
    if (typeof targetPageName !== 'undefined') {
      modulesToShow = this.config.hiddenPages[targetPageName]
    } else {
      if (!this.config.pages[this.curPage]) {
        // @todo: send EXT-Alert
        modulesToShow = this.config.fixed
      }
      else modulesToShow = this.config.fixed.concat(this.config.pages[this.curPage])
    }

    const animationTime = this.config.animationTime / 2
    
    MM.getModules()
      .exceptModule(this)
      .exceptWithClass(modulesToShow)
      .enumerate(module => {
        if (!module.hidden) module.hide(animationTime, lockStringObj)
      })

    // Shows all modules meant to be on the current page, after a small delay.
    setTimeout(() => {
      MM.getModules()
        .exceptModule(this)
        .withClass(modulesToShow)
        .enumerate(module => {
          if (module.hidden) {
            if (this.config.animates[module.name] && this.animateStyle[this.config.animates[module.name]]) {
              this.animateCSS(module.identifier, this.animateStyle[this.config.animates[module.name]]).then(module.show(0, lockStringObj))
            }
            else module.show(animationTime, lockStringObj)
          }
        })
    }, animationTime)
    if (this.config.indicator) this.updateDom()
  },

  /**
   * Resets the page changing timer with a delay.
   *
   * @param {number} delay the delay, in milliseconds.
   */
  resetTimerWithDelay: function (delay) {
    if (this.config.rotationTime > 0) {
      // This timer is the auto rotate function.
      clearInterval(this.timer)
      // This is delay timer after manually updating.
      clearTimeout(this.delayTimer)

      this.delayTimer = setTimeout(() => {
        this.timer = setInterval(() => {
          this.notificationReceived('PAGE_INCREMENT')
        }, this.config.rotationTime)
      }, delay)
    } else if (this.config.rotationHomePage > 0) {
      // This timer is the auto rotate function.
      clearInterval(this.timer)
      // This is delay timer after manually updating.
      clearTimeout(this.delayTimer)

      this.delayTimer = setTimeout(() => {
        this.timer = setInterval(() => {
          this.notificationReceived('PAGE_CHANGED', this.config.homePage)
        }, this.config.rotationHomePage)
      }, delay)
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
      Log.warn(`[Pages]: Was asked to ${stateBaseString}e but rotation is already ${stateBaseString}ed!`)
    } else {
      Log.log(`[Pages]: ${stateBaseString}ing rotation`)
      if (!isRotating) {
        clearInterval(this.timer)
        clearTimeout(this.delayTimer)
      } else {
        this.resetTimerWithDelay(this.rotationDelay)
      }
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
      Log.error(`[Pages] Hidden page "${name}" does not exist!`)
    }
  },

  /**
   * Handle Animation
   */
  animateCSS: function (element, animation) {
    // We create a Promise and return it
    return new Promise((resolve, reject) => {
      const animationName = this.animatePrefix+animation
      const node = document.getElementById(element)
      node.style.setProperty("--animate-duration", (this.config.animationTime/1000)+"s")
      node.classList.add(`${this.animatePrefix}animated`, animationName)
  
      // When the animation ends, we clean the classes and resolve the Promise
      function handleAnimationEnd(event) {
        event.stopPropagation()
        node.classList.remove(`${this.animatePrefix}animated`, animationName)
        resolve('Animation ended')
      }
  
      node.addEventListener('animationend', handleAnimationEnd, {once: true})
    })
  },

  checkPagesConfig: function() {
    if (Object.keys(this.config.pages).length) {
      for (let i = 0; i < Object.keys(this.config.pages).length; i += 1) {
        if (!this.config.pages[i]) {
          Log.error("[Pages] Page " + i + " is undefined")
          // send EXT-Alert error
        }
      }
    }
  },

  getCommands: function(commander) {
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
        if (args[0] > Object.keys(this.config.pages).length) {
          return handler.reply("TEXT", "Page not found: " + args[0])
        }
        handler.reply("TEXT", "Change page number to " + args[0])
        return this.notificationReceived("PAGE_CHANGED", parseInt(args[0]))
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
        return this.notificationReceived("SHOW_HIDDEN_PAGE", args[0])
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
