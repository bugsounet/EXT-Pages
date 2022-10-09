# Ext-Pages (aska MMM-pages v2)

This [MagicMirror²][mm²] Module allows you to have animated pages in your magic mirror!<br>
Want to have more modules in your magic mirror, but want to keep the format?<br>
Or, want to have grouped modules that are themed together? Look no further!<br>

![Example](example.webp)

Note that this module does not provide any method of manually changing the page!<br>
You should ask other developers to add a notification to their modules, or add
one yourself!

## Installation

In your terminal, go to your MagicMirror's Module folder:

```bash
cd ~/MagicMirror/modules
```

Clone this repository and install it:

```bash
git clone https://github.com/bugsounet/EXT-Pages
npm install
```

Configure the module in your config.js file.

## Using the module

To use this module, add it to the modules array in the `config/config.js` file.<br>
Note: module names used in the following example are fictitious.

```js
{
  module: "EXT-Pages",
  position: "bottom_bar",
  config: {
    pages: {
      0: [ "newsfeed" ],
      1: [ "calendar", "compliments" ]
    },
    fixed: [ "clock", "weather" ],
    hiddenPages: {
      "screenSaver": [ "clock", "MMM-SomeBackgroundImageModule" ],
      "admin": [ "MMM-ShowMeSystemStatsModule", "MMM-AnOnScreenMenuModule" ],
    },
    animates: {
      "newsfeed": 24,
      "calendar": 36,
      "compliments": 51,
      "weather": 37
    },
    indicator: true,
    rotationTime: 15000
  }
},

```

## Configuration options

| Option | Type | Default Value | Description |
| --- | --- | --- | --- |
| `pages`             | `{Number: [String...]...}` | `{}`                     | An Object String number of what each module should be on which page. Note that all entries must take their class name (e.g. this module's class name is `EXT-Pages`, while the default modules may just have `newsfeed`, without the `MMM-` or `EXT-` prefix. |
| `fixed`             | `[String...]`              | `[]`                     | Which modules should show up all the time. |
| `hiddenPages`       | `{String: [String...]...}` | `{}`                     | An Object defining special `hiddenPages` which are not available on the normal page rotation and only accassible via a notification. Modules defined in `fixed` are ignored and need to be also added if you wish to have them on any hidden page. |
| `animates`          | `{String: Number,...}`     | `{}`                     | An Object with module name and special animates number (see below)
| `animationTime`     | `int`                      | `1000`                   | Fading animation time. Set to `0` for instant change. Value is in milliseconds (1 second = 1000 milliseconds). |
| `rotationTime`      | `int`                      | `0`                      | Time, in milliseconds, between automatic page changes. |
| `rotationDelay`     | `int`                      | `10000`                  | Time, in milliseconds, of how long should a manual page change linger before returning to automatic page changing. In other words, how long should the timer wait for after you manually change a page. This does include the animation time, so you may wish to increase it by a few seconds or so to account for the animation time. |
| `rotationHomePage`  | `int`                      | `0`                      | Time, in milliseconds, before automatically returning to the home page. If a home page is not set, this returns to the leftmost page instead. |
| `homePage`          | `int`                      | `0`                      | Which page index is the home page. If none is set, this returns to the leftmost page instead. |
| `useLockString`     | `bool`                     | `true`                   | Whether or not to use a lock string to show or hide pages. If disabled, other modules may override when modules may be shown. _Advanced users only. Only override this if you know what you're doing._
| `indicator`         | `bool`                     | `true`                   | Activate page-indicator |
| `activeBright`      | `bool`                     | `false`                  | Should the active circle be bright ? (only if indicator activated)|
| `inactiveDimmed`	  | `bool`                     | `true`                   | Should the inactive circles be dimmed? (only if indicator activated)|
| `inactiveHollow`	  | `bool`                     | `true`                   | Should the inactive circles be hollow? (only if indicator activated)|

## Notifications

The following is the list of notifications that EXT-Pages will handle:

| Notification | Payload type | Description |
| --- | --- | --- |
| `PAGE_CHANGED`      | `int`           | EXT-Pages will switch to the provided page index. |
| `PAGE_INCREMENT`    | `int`, Optional | EXT-Pages will increment the page, or by `n` times if a number is provided. Not providing a number is equivalent to sending a payload of `1`. If there are no more pages to increment by, this will loop around to the first page. |
| `PAGE_DECREMENT`    | `int`, Optional | EXT-Pages will decrement the page, or by `n` times if a number is provided. Not providing a number is equivalent to sending a payload of `1`. If there are no more pages to decrement by, this will loop around to the last page. |
| `QUERY_PAGE_NUMBER` | *None*          | EXT-Pages will respond with `PAGE_NUMBER_IS` with the current page index. |
| `PAUSE_ROTATION`    | *None*          | If EXT-Pages is set to rotate, this will pause rotation until a `RESUME_ROTATION` notification is sent. This does nothing if rotation was already paused. |
| `RESUME_ROTATION`   | *None*          | If EXT-Pages was requested to pause rotation, this will resume automatic rotation. This does nothing EXT-Pages was not requested to pause. |
| `HOME_PAGE`         | *None*          | Return to the home page. If no home page is provided, return to the first page instead. |
| `SHOW_HIDDEN_PAGE`  | `String`        | EXT-Pages will switch to the provided hidden page name. |
| `LEAVE_HIDDEN_PAGE` | *None*          | EXT-Pages will leave the currently showing hidden page and return to the previous showing page index. |

The following is the list of notifications that EXT-Pages sends out:

| Notification        | Payload type | Description                                                                                                                                                    |
| ------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEW_PAGE`          | `int`        | This notification is sent out on every page change and contains the current page index. This is to help other modules keep track of what the current page is. This is also sent out during initialization. |
| `PAGE_NUMBER_IS`    | `int`        | Sent in response to a `QUERY_PAGE_NUMBER` notification. Returns the current page index. This notification sends the same payload as `NEW_PAGE`.                |

### Notes

This module responds to the notification `PAGE_CHANGED` and the payload strictly
must be an `integer`. Note that this has strict error checking, so `"3"` will
not work, while `3` will.

This module keeps track of pages by their index rather than their page number,
so the leftmost page has an index of 0, the page to the right of that has an
index of 1, and the page to the right of that has an index of 2. Thus, to change
to the third page, your module should send out:

```js
this.sendNotification("PAGE_CHANGED", 2);
```

This module keeps internal track of how many pages you have, defined by your
config in the config file. There is no way to dynamically change the pages you
have. If there arises a need, please create an issue.

This module does not enforce how other modules represents or even responds to
EXT-Pages notifications.

### Hidden pages

The idea behind hidden pages is to be able to create special "modes" which
are totally configurable by the user and are seperated from the "normal" MM² operation.
Some examples would be a "guest", "admin" or "screensaver" mode, where only very
specific modules are shown and you do not want to have them in your normal page roation.

These hidden pages are only accessible via notifications, so you need to send them from
other modules. Examples integrations could be with touch, bots or voice commands.

### animates feature

animated feature allows to define an animation to a module<br>
There is actually 55 animations available.<br>
We use [animate.css](https://animate.style/)<br>
All animations are defined by a number.

```js
      // Attention seekers
      1: "bounce"
      2: "flash"
      3: "pulse"
      4: "rubberBand"
      5: "shakeX"
      6: "shakeY"
      7: "headShake"
      8: "swing"
      9: "tada"
      10: "wobble"
      11: "jello"
      12: "heartBeat"
      // Back entrances
      13: "backInDown"
      14: "backInLeft"
      15: "backInRight"
      16: "backInUp"
      // Bouncing entrances
      17: "bounceIn"
      18: "bounceInDown"
      19: "bounceInLeft"
      20: "bounceInRight"
      21: "bounceInUp"
      // Fading entrances
      22: "fadeIn"
      23: "fadeInDown"
      24: "fadeInDownBig"
      25: "fadeInLeft"
      26: "fadeInLeftBig"
      27: "fadeInRight"
      28: "fadeInRightBig"
      29: "fadeInUp"
      30: "fadeInUpBig"
      31: "fadeInTopLeft"
      32: "fadeInTopRight"
      33: "fadeInBottomLeft"
      34: "fadeInBottomRight"
      // Flippers
      35: "flip"
      36: "flipInX"
      37: "flipInY"
      // Lightspeed
      38: "lightSpeedInRight"
      39: "lightSpeedInLeft"
      // Rotating entrances
      40: "rotateIn"
      41: "rotateInDownLeft"
      42: "rotateInDownRight"
      43: "rotateInUpLeft"
      44: "rotateInUpRight"
      // Specials
      45: "jackInTheBox"
      46: "rollIn"
      // Zooming entrances
      47: "zoomIn"
      48: "zoomInDown"
      49: "zoomInLeft"
      50: "zoomInRight"
      51: "zoomInUp"
      // Sliding entrances
      52: "slideInDown"
      53: "slideInLeft"
      54: "slideInRight"
      55: "slideInUp"
```

Just check [animate.css](https://animate.style/) and find for prefered animation your module !<br>
Report number in accord of the animation name like in configuration sample

### Credits
 * [@edward-shen](https://github.com/edward-shen) for [MMM-pages](https://github.com/edward-shen/MMM-pages) and [MMM-page-indicator](https://github.com/edward-shen/MMM-page-indicator)
 * @bugsounet (for bug hunts and renew/review coding!)
