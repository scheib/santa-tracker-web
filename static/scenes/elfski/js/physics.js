/*
 * Copyright 2017 Google Inc. All rights reserved.
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

import * as vec from './vec.js';

const slerpRatio = 4;
const accelerationBar = 0.5;
const maximumSpeed = 0.66;
const stopBar = 0.75;  // angle at which we are trying to stop
const initialAngle = Math.PI/2;

export class Character {
  constructor() {
    /** @private {number} */
    this._speed = 0;
    
    /** @private {vec.Vector} */
    this._angle = initialAngle;

    /** @private {number} */
    this._line = 0;
  }

  /**
   * @return {number}
   */
  get speed() {
    return this._speed;
  }

 /**
  * @return {number}
  */
  get speedRatio() {
    return this._speed / maximumSpeed;
  }

  /**
   * @return {number} line width due to rotation
   */
  get lineWidth() {
    return this._line;
  }

  /**
   * @return {number} angle in rads
   */
  get angle() {
    return this._angle;
  }

  /**
   * @return {vec.Vector} angle vector
   */
  get angleVec() {
    return {x: Math.sin(this._angle), y: Math.cos(this._angle)}
  }

  /**
   * @param {number} v angle in rads
   */
  set angle(v) {
    this._angle = v;
  }

  /**
   * @export
   */
  crash() {
    this._speed = 0;
    this._angle = math.sign(this._angle) * initialAngle;
  }

  /**
   * @export
   */
  reset() {
    this._speed = 0;
    this._angle = initialAngle;
    this._line = 0;
  }

  /**
   * @param {number} delta as fraction of second
   * @param {?vec.Vector=} target relative to character position
   * @return {{x: number, y: number}} amount to move by
   * @export
   */
  tick(delta, target=null) {
    if (target) {
      target = vec.unitVec(target);  // deal with bad client data

      // player is drifting "up", so retain vector
      if (target.y < 0) {
        target = {
          x: (target.x > 0) ? 1 : -1,
          y: 0,
        };
      }

      const targetAngle = Math.atan2(target.x, target.y)
      const by = slerpRatio * delta * (maximumSpeed * 2 - this._speed);
console.log(
  "angle " + this._angle.toFixed(2),
  "target " + targetAngle.toFixed(2),
  "x "+target.x.toFixed(2),
  "y "+target.y.toFixed(2),
  "by " + by.toFixed(2));
      this._angle = this._angle + by * (targetAngle - this._angle);

      this._line = Math.abs(targetAngle - this._angle);  // difference between player/goal
    } else {
      this._line = 0;  // character not changing direction
    }

    const angle = this.angle;
    let accel = Math.cos(angle) - accelerationBar;
    if (accel < 0) {
      accel = Math.tan(accel);
    }

    this._speed += accel * delta;
    if (this._speed < 0) {
      this._speed = 0;
    } else if (this._speed > maximumSpeed) {
      this._speed = maximumSpeed;
    }

    return {
      x: this._speed * Math.sin(angle) * delta,
      y: this._speed * Math.cos(angle) * delta,
    };
  }
}

