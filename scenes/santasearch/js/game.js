/*
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

goog.provide('app.Game');

goog.require('app.Controls');
goog.require('app.Constants');
goog.require('app.Characters');
goog.require('app.shared.utils');
goog.require('app.shared.Gameover');



/**
 * Main game class
 * @param {!Element} elem An DOM element which wraps the game.
 * @constructor
 * @export
 */
app.Game = function(elem) {
  this.elem = $(elem);
  this.mapElem = this.elem.find('.map');
  this.guiElem = this.elem.find('.gui');
  this.drawerElem = this.elem.find('.drawer');
  this.drawerHeight = this.drawerElem.height();

  this.gameoverModal = new app.shared.Gameover(this, this.elem.find('.gameover'));

  this.gameStartTime = null;
  this.sceneElem = this.elem.find('.scene');
  this.controls = new app.Controls(this.elem, this.mapElem);

  this.gameAspectRatio = 1600 / 900;

  this.mapElementDimensions = {};
  this.characters = new app.Characters(this.mapElem, this.drawerElem, this.mapElementDimensions, this.gameAspectRatio);

  this.onFrame_ = this.onFrame_.bind(this);
};


/**
 * Start the game
 * @export
 */
app.Game.prototype.start = function() {
  this._setupEventHandlers();
  this.restart();
};

/**
 * Sets up event handlers for the game
 * @private
 */
app.Game.prototype._setupEventHandlers = function() {
  $(window).on('resize.santasearch orientationchange.santasearch', this._onResize.bind(this));
};

app.Game.prototype._getRandomHintDistanceOffset = function() {
  let hintDistance = app.Constants.HINT_RANDOM_DISTANCE;
  let random = Math.floor(Math.random() * hintDistance);

  // Will make it go either positive or negative
  let value = (hintDistance / 2) - random;

  return value / 100;
};

/**
 * Sets the zoom to 2 and pans the camera to where the character can be found
 * @param {string} characterName Name of the character.
 * @private
 */
app.Game.prototype._hintLocation = function(characterName) {
  let scale = app.Constants.HINT_ZOOM / this.controls.scale;

  // The location of the character is a top/left percentage of the map
  let characterLocation = this.characters.getCharacterLocation(characterName);

  let randomLeftOffset = this._getRandomHintDistanceOffset();
  let randomTopOffset = this._getRandomHintDistanceOffset();

  let leftScale = (0.5 - characterLocation.left) + randomLeftOffset;
  let topScale = (0.5 - characterLocation.top) + randomTopOffset;

  let targetX = this.mapElementDimensions.width * leftScale;
  let targetY = this.mapElementDimensions.height * topScale;

  let scaledMapWidth = this.mapElementDimensions.width * scale;
  let scaledMapHeight = this.mapElementDimensions.height * scale;

  targetX = this._clampXPanForWidth(targetX, scaledMapWidth);
  targetY = this._clampYPanForHeight(targetY, scaledMapHeight);

  this.controls.enabled = false;
  this.mapElem.css('transform', `translate3d(${targetX}px, ${targetY}px, 0) scale(${scale}, ${scale})`);
  this.mapElem.css('transition-duration', `${app.Constants.HINT_BUTTON_PAN_TIME}s`);
  this.hintActive = true;

  setTimeout(function() {
    this.mapElem.css('transition-duration', '0s');
    this.controls.enabled = true;
    this.controls.scale = app.Constants.HINT_ZOOM;
    this.controls.pan.x = targetX;
    this.controls.pan.y = targetY;
    this.controls.needsScaleUpdate = true;
    this.controls.needsPanUpdate = true;
  }.bind(this), app.Constants.HINT_BUTTON_PAN_TIME * 1000);
};

app.Game.prototype._preScale = function(targetScale) {
  this.controls.enabled = false;

  let scaleBefore = this.controls.scale;

  let scale = targetScale / scaleBefore;

  let scaledMapWidth = this.mapElementDimensions.width * scale;
  let scaledMapHeight = this.mapElementDimensions.height * scale;

  this.controls._scalePan(scaleBefore, targetScale);

  let targetX = this._clampXPanForWidth(this.controls.pan.x, scaledMapWidth);
  let targetY = this._clampYPanForHeight(this.controls.pan.y, scaledMapHeight);

  this.mapElem.css('transition-duration', `${app.Constants.PRESCALE_TIME}s`);
  this.mapElem.css('transform', `translate3d(${targetX}px, ${targetY}px, 0) scale(${scale}, ${scale})`);

  console.log('preScale called');
  console.log('prescaling from ' + scaleBefore + ' to ' + targetScale);

  setTimeout(function() {
    this.mapElem.css('transition-duration', '0s');
    this.controls.enabled = true;
    // this.controls.scale = targetScale;
    // this.controls.pan.x = targetX;
    // this.controls.pan.y = targetY;
    // this.controls.needsScaleUpdate = true;
    // this.controls.needsPanUpdate = true;
  }.bind(this), app.Constants.PRESCALE_TIME * 1000);
};

/**
 * Scales the map when the user wants to zoom in our out
 * @param {number} value Scale factor.
 * @private
 */
app.Game.prototype._scale = function(value) {
  let windowAspectRatio = window.innerWidth / window.innerHeight;

  if (windowAspectRatio < this.gameAspectRatio) {
    this.mapElementDimensions.width = window.innerHeight * this.gameAspectRatio;
    this.mapElementDimensions.height = window.innerHeight;
  } else {
    this.mapElementDimensions.width = window.innerWidth;
    this.mapElementDimensions.height = window.innerWidth / this.gameAspectRatio;
  }

  this.mapElementDimensions.width *= value;
  this.mapElementDimensions.height *= value;

  this.mapElem.css('width', this.mapElementDimensions.width);
  this.mapElem.css('height', this.mapElementDimensions.height);

  this.mapElem.css('margin-left', -(this.mapElementDimensions.width / 2));
  this.mapElem.css('margin-top', -(this.mapElementDimensions.height / 2));

  this.characters.updateCharacters();
}

app.Game.prototype._clampXPanForWidth = function(panX, width) {
  let max = (width - window.innerWidth) / 2;

  let diff = max - Math.abs(panX);

  if (diff < 0) {
    panX = (panX < 0) ? -max : max;
  }

  return panX;
};

app.Game.prototype._clampYPanForHeight = function(panY, height) {
  let max = (height - window.innerHeight) / 2;

  if (panY < 0) {
    max += this.drawerHeight;
  }

  let diff = max - Math.abs(panY);

  if (diff < 0) {
    panY = (panY < 0) ? -max : max;
  }

  return panY;
}

/**
 * Makes sure that the player can not pan out of the map
 * @private
 */
app.Game.prototype._updatePan = function() {
  let panX = this.controls.pan.x;
  let mapWidth = this.mapElementDimensions.width;

  let panY = this.controls.pan.y;
  let mapHeight = this.mapElementDimensions.height;

  this.controls.pan.x = this._clampXPanForWidth(panX, mapWidth);
  this.controls.pan.y = this._clampYPanForHeight(panY, mapHeight);
}

/**
 * Resets all game entities and restarts the game. Can be called at any time.
 */
app.Game.prototype.restart = function() {
  this.paused = false;
  this.unfreezeGame();
  this._onResize();

  window.santaApp.fire('analytics-track-game-start', {gameid: 'santasearch'});
  this.gameStartTime = +new Date;

  this.controls.reset();
  this._scale(1);
  this.characters.initialize();

  this.characters.focusNextUnfoundCharacter();

  this.controls.start();
};

/**
 * Updates game state since last frame.
 * @param {number} delta Time elapsed since last update in milliseconds
 */
app.Game.prototype.update = function(deltaInMilliseconds) {
  if (!this.isPlaying) {
    return;
  }

  if (this.characters.allFound) {
    this.gameoverModal.show();
    return;
  }

  if (this.characters.hintTarget) {
    this._hintLocation(this.characters.hintTarget);
    this.characters.hintTarget = undefined;
  }

  if (this.controls.scaleTarget) {
    this._preScale(this.controls.scaleTarget);
    this.controls.scaleTarget = undefined;
  }

  if (this.controls.needsScaleUpdate && this.controls.enabled) {
    this._scale(this.controls.scale);
    this.controls.needsScaleUpdate = false;
  }

  if (this.controls.needsPanUpdate && this.controls.enabled) {
    this._updatePan();

    let panX = this.controls.pan.x;
    let panY = this.controls.pan.y;

    this.mapElem.css('transform', `translate3d(${panX}px, ${panY}px, 0)`);
    this.controls.needsPanUpdate = false;
  }

  this.accumulator += deltaInMilliseconds;
};


/**
 * Freezes the game. Stops the onFrame loop and stops any CSS3 animations.
 * Used both for game over and pausing.
 */
app.Game.prototype.freezeGame = function() {
  this.isPlaying = false;
  this.elem.addClass('frozen');
};


/**
 * Unfreezes the game, starting the game loop as well.
 */
app.Game.prototype.unfreezeGame = function() {
  if (!this.isPlaying) {
    this.elem.removeClass('frozen');

    this.isPlaying = true;
    this.lastFrame = +new Date();
    this.requestId = app.shared.utils.requestAnimFrame(this.onFrame_);
  }
};


/**
 * Game loop. Runs every frame using requestAnimationFrame.
 * @private
 */
app.Game.prototype.onFrame_ = function() {
  if (!this.isPlaying) {
    return;
  }

  // Calculate delta since last frame.
  var now = +new Date();
  var delta = Math.min(1000, now - this.lastFrame);
  this.lastFrame = now;

  // Update game state
  this.update(delta);

  // Request next frame
  this.requestId = app.shared.utils.requestAnimFrame(this.onFrame_);
};


/**
 * Pause the game.
 */
app.Game.prototype.pause = function() {
  this.paused = true;
  this.freezeGame();
};


/**
 * Resume the game.
 */
app.Game.prototype.resume = function() {
  this.paused = false;
  this.unfreezeGame();
};


/**
 * Makes sure the map will never be smaller than the window.
 * @private
 */
app.Game.prototype._onResize = function() {
  let windowWidthLargerThanMap = window.innerWidth > this.mapElementDimensions.width;
  let windowHeightLargerThanMap = window.innerHeight > this.mapElementDimensions.height;

  let mapNeedsResizing = windowWidthLargerThanMap || windowHeightLargerThanMap;

  if (mapNeedsResizing) {
    this._scale(this.controls.scale);
  }

  // Scale GUI
  var scale = Math.min(1, window.innerWidth / 1200);
  this.guiElem.css('font-size', scale + 'px');
  this.drawerHeight = this.drawerElem.height();
};


/**
 * Dispose the game.
 * @export
 */
app.Game.prototype.dispose = function() {
  if (this.isPlaying) {
    var opts = {
      gameid: 'santasearch',
      timePlayed: new Date - this.gameStartTime,
      level: 1
    };
    window.santaApp.fire('analytics-track-game-quit', opts);
  }
  this.freezeGame();

  app.shared.utils.cancelAnimFrame(this.requestId);
  $(window).off('.santasearch');
  $(document).off('.santasearch');
  this.elem.off('.santasearch');
};
