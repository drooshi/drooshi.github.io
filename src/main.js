'use strict';

(function(global){
  function toArray(obj) {
    var result = [];
    for (var i = 0; i < (obj.length || 0); i++) {
      result.push(obj[i]);
    }
    return result;
  }

  function getByClassNameAll(className) {
    return toArray(document.getElementsByClassName(className));
  }

  function getByClassName(className) {
    return document.getElementsByClassName(className)[0];
  }

  function getByTagName(tagName) {
    return document.getElementsByTagName(tagName)[0];
  }

  function toNode(v) {
    if (v instanceof Node) {
      return v;
    }
    else {
      return document.createTextNode(v);
    }
  }

  var Drooshi = {};

  Drooshi.dBody = getByTagName('body');
  Drooshi.dMain = getByClassName('drooshi-main');
  Drooshi.dHeading = getByClassName('drooshi-heading');
  Drooshi.dBox = getByClassName('drooshi-box');
  Drooshi.dImg = getByClassName('drooshi-img');
  Drooshi.dTime = getByClassName('timer-time');
  Drooshi.dAutoplay = getByClassName('autoplay-overlay');
  Drooshi.dSelect = getByClassName('drooshi-selector');
  Drooshi.dList = getByClassName('drooshi-list');
  Drooshi.dSelectLinkL = getByClassNameAll('drooshi-select-link');

  Drooshi.autoplay = !(localStorage.getItem('autoplay') === 'false');

  Drooshi.classes = [];

  function createElement(name, attrs, children) {
    var el = document.createElement(name);

    // Shorthand for class
    if (typeof attrs === 'string') {
      attrs = {class: attrs};
    }
    Object.keys(attrs).forEach(function(attr) {
      if (attr.substr(0,2) === 'on') {
        el.addEventListener(attr.substr(2).toLowerCase(), attrs[attr]);
      }
      else {
        el.setAttribute(attr, attrs[attr]);
      }
    });

    if (children instanceof Array) {
      children.forEach(function(child) {
        el.appendChild(toNode(child));
      });
    }
    else {
      el.appendChild(toNode(children));
    }
    return el;
  }

  // The main loop responsible for animations
  function Loop() {
    this._listeners = [];
    this.loop = this.loop.bind(this);
    this.time = 0;
    this.DELTA_TIME_CAP = 1000;
    this.running = false;
  }

  Loop.prototype = {
    constructor: Loop,
    loop: function() {
      var time = this.time;
      var absTime = Date.now();
      var absDeltaTime = absTime - this.absLastFrameTime;
      var deltaTime = Math.min(absDeltaTime < 0 ? 0 : absDeltaTime, this.DELTA_TIME_CAP);
      time += deltaTime;

      this._listeners.forEach(function(listener) {
        listener(time, deltaTime);
      });
      this.af = requestAnimationFrame(this.loop);

      this.absLastFrameTime = absTime;
      this.time = time;
    },
    start: function() {
      if (this.running) {
        return;
      }
      if (!this.absLastFrameTime) {
        this.absLastFrameTime = Date.now();
      }
      this.af = requestAnimationFrame(this.loop);
      this.running = true;
    },
    stop: function() {
      cancelAnimationFrame(this.af);
      this.running = false;
    },
    subscribe: function(listener) {
      var isSubscribed = true;
      var listeners = this._listeners;
      listeners.push(listener);

      return function unsubscribe() {
        if (!isSubscribed) {
          return false;
        }
        listeners.splice(listeners.indexOf(listener), 1);
      }
    }
  }

  Drooshi.Loop = Loop;

  // A general 2-dimensional vector
  function Vector2(x, y) {
    this.x = x;
    this.y = y;
  }

  Vector2.prototype = {
    constructor: Vector2,
    fitIn: function(outer) {
      var inner = this;
      var ratio = Math.min(outer.x / inner.x, outer.y / inner.y ,1);

      if (isNaN(ratio)) {
        return new Vector2(Math.min(outer.x, inner.x), Math.min(outer.y, inner.y))
      }

      return new Vector2(inner.x * ratio, inner.y * ratio);
    },
    scale: function(a) {
      if (a instanceof Vector2) {
        return new Vector2(this.x * a.x, this.y * a.y);
      }
      return new Vector2(this.x * a, this.y * a);
    }
  }

  Drooshi.Vector2 = Vector2;

  // Calculate the calculated size of the drooshiBox
  Drooshi.calcdBoxInnerSize = function() {
    var bounding = Drooshi.dBox.getBoundingClientRect();
    return new Vector2(bounding.width - 2 * Drooshi.config.boxPadding,
      bounding.height - 2 * Drooshi.config.boxPadding);
  };

  Drooshi.fitDrooshi = function() {
    var box = Drooshi.calcdBoxInnerSize();
    var fit = Drooshi.config.drooshiSize.fitIn(box.scale(Drooshi.config.bounds));

    Drooshi.dImg.style.width = fit.x.toString() + 'px';
    Drooshi.dImg.style.top = ((box.y - fit.y) / 2).toString() + 'px';
  };

  Drooshi.createDrooshiOption = function(config) {
    return createElement('div', 'drooshi-li',
      createElement('a', {
        href: '#',
        onClick: function(e)  {
          e.preventDefault();
          Drooshi.setDrooshi(config);
        },
        class: 'drooshi-li-link'
        }, [
        createElement('div', (function() {
          var attrs = {class: 'drooshi-li-left'};
          if (config.iconStyle) {
            attrs.style = config.iconStyle;
          }
          return attrs;
        })(),
          createElement('div', 'drooshi-li-inner', (function() {
            var drooshi = createElement('img', {
              class: 'drooshi-li-drooshi',
              src: Drooshi.config.drooshiSrc
            });
            if (config.flag) {
              return [drooshi, createElement('img', {
                class: 'drooshi-li-flag',
                src: config.flag,
                alt: 'Flag'
              })];
            }
            else {
              return [drooshi];
            }
          })())
        ),
        createElement('div', 'drooshi-li-right', config.displayName)
      ]));
  };

  Drooshi.Drooshify = function() {
    var sequence = Drooshi.config.moveSequence;
    var dtSinceLastMove = -1;
    var step = 0;
    var amplitude = Drooshi.config.amplitude;
    var timeStep = Drooshi.config.timeStep;

    function move() {
      Drooshi.dImg.style.transform = 'translate(' + sequence[step] * amplitude * 100 + '%, 0%)';
      step = ++step >= sequence.length ? 0 : step;
    }

    return function(t, dt) {
      if (dtSinceLastMove === -1) {
        move();
        dtSinceLastMove = 0;
      }
      else if (dt > timeStep) {
        move();
        dtSinceLastMove = 0;
      }
      else if (dtSinceLastMove >= timeStep) {
        move();
        dtSinceLastMove = (dtSinceLastMove + dt) % timeStep;
      }
      else {
        dtSinceLastMove += dt;
      }
    }
  }

  function DrooshiTimer() {
    this.render = this.render.bind(this);
    this.reset();
  }

  DrooshiTimer.prototype = {
    constructor: DrooshiTimer,
    reset: function() {
      this.startTime = Date.now();
    },
    render: function() {
      Drooshi.dTime.textContent = ((Date.now() - this.startTime) / 1000).toFixed(1);
    }
  }

  Drooshi.DrooshiTimer = DrooshiTimer;

  Drooshi.setAutoplay = function(status) {
    localStorage.setItem('autoplay', !!status);
  };

  function changeClasses(classList) {
    Drooshi.classes = Drooshi.classes.filter(function(c) {
      if (classList.indexOf(c) === -1) {
        Drooshi.dBody.classList.remove(c);
        return false;
      }
      return true;
    });
    classList.forEach(function(c) {
      if (Drooshi.classes.indexOf(c) === -1) {
        Drooshi.dBody.classList.add(c);
        Drooshi.classes.push(c);
      }
    });
  }

  Drooshi.showSelector = function(ev) {
    ev.preventDefault();
    changeClasses([]);

    Drooshi.loop.stop();
    Drooshi.dMain.style.display = 'none';
    Drooshi.dSelect.style.display = '';
  };

  Drooshi.setDrooshi = function(option, initial) {
    Drooshi.dHeading.textContent = option.heading;

    var classes = option.classes || [];
    changeClasses(classes);

    Drooshi.setMusic(option.audio, initial);
    Drooshi.dSelect.style.display = 'none';
    Drooshi.dMain.style.display = '';
    Drooshi.loop.start();
    Drooshi.fitDrooshi();

    Drooshi.currentOption = option;
  }

  Drooshi.setMusic = function(nextAudio, initial) {
    if (initial || Drooshi.currentOption.audio !== nextAudio) {
      if (Drooshi.audio) {
        Drooshi.audio.src = nextAudio;
      }
      else {
        Drooshi.audio = new Audio(nextAudio);
        Drooshi.audio.loop = true;
      }
    }


    if (!Drooshi.autoplay && initial) {
      Drooshi.audio.pause();
    }
    else {
      Drooshi.audio.play();
    }

    Drooshi.dAutoplay.addEventListener('click', function(){
      Drooshi.autoplayOverlay.click();
    });

    // Mobile devices don't autoplay music, so we need to show a notice
    if (Drooshi.audio.paused) {
      Drooshi.autoplayOverlay.show();
    }
  }

  Drooshi.autoplayOverlay = {
    show: function() {
      clearTimeout(Drooshi.autoplayOverlay.timeout);

      // The opacity transition doesn't work here due to the browser batching
      // layout and paint (we could force one with a forced reflow), but this
      // doesn't really seem necessary here
      Drooshi.dAutoplay.style.display = '';
      Drooshi.dAutoplay.style.opacity = 1;
    },
    click: function() {
      Drooshi.audio.play();
      Drooshi.autoplayOverlay.hide();
    },
    hide: function() {
      Drooshi.dAutoplay.style.opacity = 0;
      Drooshi.autoplayOverlay.timeout = setTimeout(function() {
        Drooshi.dAutoplay.style.display = 'none';
      }, Drooshi.config.autoplayFadeTimeout);
    }
  };

  Drooshi.config = {
    autoplayFadeTimeout: 200,
    boxPadding: 8,
    drooshiSize: new Vector2(813, 681),
    bounds: new Vector2(0.9, 1),
    moveSequence: [-3, -1, 1, 3, 3, 1, 3, 1, -1],
    amplitude: 0.012,
    timeStep: 125,
    drooshiSrc: '/assets/img/drooshi.png',
    options: [
      {
        displayName: 'Original Romanian Drooshi',
        heading: 'NUMA DROOSHI!!!',
        audio: '/assets/music/romanian.mp3',
        flag: '/assets/specific/flags/romanian-120px.png'
      },
      {
        displayName: 'English Drooshi',
        heading: 'ENGLISH DROOSHI!!!',
        audio: '/assets/music/english.mp3',
        flag: '/assets/specific/flags/english-120px.png'
      },
      {
        displayName: 'Nightcore Drooshi',
        heading: 'NIGHTCORE DROOSHI!!!',
        audio: '/assets/music/nightcore.mp3',
        iconStyle: 'background: url(/assets/specific/nightcore/bg.jpg); background-size: cover',
        classes: ['nightcore']
      }
    ],
    initialOption: 0
  };

  Drooshi.config.options.forEach(function(option) {
    Drooshi.dList.appendChild(Drooshi.createDrooshiOption(option));
  });

  Drooshi.dSelectLinkL.forEach(function(el) {
    el.addEventListener('click', Drooshi.showSelector);
  });

  Drooshi.currentOption = Drooshi.config.options[Drooshi.config.initialOption]

  Drooshi.fitDrooshi();
  window.addEventListener('resize', Drooshi.fitDrooshi);

  Drooshi.loop = new Loop();
  Drooshi.drooshiTimer = new DrooshiTimer();
  Drooshi.loop.subscribe(Drooshi.Drooshify());
  Drooshi.loop.subscribe(Drooshi.drooshiTimer.render);

  Drooshi.setDrooshi(Drooshi.currentOption, true);

  window.Drooshi = Drooshi;
})(window);
