/*
 * University of London Computer Science
 * Programming 1 -- Final Project
 * Brian Landers <brian@packetslave.com>
 *
 * Sounds:
 *   Falling Character:  "wilhelm scream", public domain, from Wikipedia
 *   Jump: "Jump Sound" by snottyboy, http://soundbible.com
 *   Treasure: "Glitter", http://noiseforfun.com
 *   Background Music: "8-BIT PERPLEXION", http://soundimage.org
 *
 * Background:
 *   "Night Mountain lake [SEAMLESS]" by Pathway
 *   https://assetstore.unity.com/packages/2d/environments/night-mountain-lake-seamless-127703
 *
 * Sprites:
 *   "Platform Game Assets Ultimate" by BayatGames
 *   https://bayatgames.com/asset/platform-game-assets-ultimate/
 *
 */
/// <reference path="./node_modules/@types/p5/global.d.ts" />

import p5 from "p5";
import "p5/lib/addons/p5.sound";

var world;
var char;

var W = 1024;
var H = 576;

//
// If this is set to true, don't process falls (makes testing easier)
//
var DISABLE_FALL = false;

var treeCounter = 0;

var assets;
var lives = 3;
var score = 0;
var winner = false;

let sketch = function (p) {

  // ======================================================================
  //  World
  // ======================================================================

  function newTurn() {
    world.scroll = world.initialScroll;
    char.x = char.initialX;
    char.y = char.initialY;
    lives = lives - 1;
  }

  class World {
    constructor(width, height, floorHeight) {
      this.w = width;
      this.h = height;
      this.floor = floorHeight;
      this.initialScroll = 0;
      this.scroll = 0;
      this.musicStarted = false;
      this.canyons = [
        new Canyon(600, 100),
        new Canyon(-1500, 500),
        new Canyon(2000, 100),
        new Canyon(2200, 100),
        new Canyon(2400, 100),
        new Canyon(3000, 1000)
      ];
      this.collectables = [
        new Collectable(800, 250, 50),
        new Collectable(2100, floorHeight - 100, 50),
        new Collectable(-1000, floorHeight - 100, 50)
      ];
      this.scenery = [
        new Mountain(-200, 432, 250, 300),
        new Mountain(this.w - 50, 432, 250, this.h - 150),
        new Mountain(-1000, 432, 350, this.h - 150),
        new Tree(-500, 150),
        new Tree(-200, 150),
        new Tree(100, 150),
        new Tree(300, 150),
        new Tree(700, 150),
        new Tree(1000, 150),
        new Tree(1200, 150),
        new Tree(1500, 150),
        new Tree(1700, 150),
        new Cloud(401, 125, 80, 70),
        new Cloud(200, 50, 66, 50),
        new Cloud(801, 100, 90, 50)
      ].concat(this.canyons, this.collectables);
      this.flag = new Flag(2900, this.floor);
      this.drawSky = function () {
        p.image(assets.background[1], 0, 0, W, H);
        p.image(assets.background[2], 0, 0, W, H);
        p.image(assets.background[3], 0, 0, W, H);
      };
      this.drawGround = function () {
        p.noStroke();
        p.fill(0, 155, 0);
        p.rect(0, this.floor, this.w, this.h / 4);
      };
      this.drawBackground = function () {
        this.drawSky();
        this.drawGround();
      };
      this.draw = function () {
        this.drawBackground();
        p.push();
        p.translate(this.scroll, 0);
        for (var i = 0; i < this.scenery.length; i += 1) {
          this.scenery[i].draw(this.floor);
        }
        this.flag.draw();
        p.pop();
      };
      return this;
    }
  }

  // ======================================================================
  //  Character
  // ======================================================================
  class Character {
    constructor(initialX, initialY, minX, maxX) {
      this.initialX = initialX;
      this.initialY = initialY;
      this.x = initialX;
      this.y = initialY;
      this.worldX = this.x - world.scroll;
      this.minX = minX;
      this.maxX = maxX;
      this.isLeft = false;
      this.isRight = false;
      this.isFalling = false;
      this.isPlummeting = false;
      this.drawFront = function () {
        p.image(assets.character.front, this.x, this.y - 100, 128, 128);
        return;
      };
      this.drawPlummeting = function () {
        p.image(assets.character.fall, this.x, this.y - 100, 128, 128);
      };
      this.drawWalkingLeft = function () {
        // Use a translation to flip the sprite
        p.push();
        p.translate(this.x + 64, 0);
        p.scale(-1.0, 1.0);
        p.translate(-this.x - 64, 0);
        p.image(assets.character.walk, this.x, this.y - 100, 128, 128);
        p.pop();
        return;
      };
      this.drawWalkingRight = function () {
        p.image(assets.character.walk, this.x, this.y - 100, 128, 128);
        return;
      };
      this.drawJumpingLeft = function () {
        p.push();
        p.translate(this.x + 64, 0);
        p.scale(-1.0, 1.0);
        p.translate(-this.x - 64, 0);
        p.image(assets.character.jump, this.x, this.y - 100, 128, 128);
        p.pop();
      };
      this.drawJumpingRight = function () {
        p.image(assets.character.jump, this.x, this.y - 100, 128, 128);
        return;
      };
      this.draw = function () {
        if (this.isFalling && this.isRight) {
          this.drawJumpingRight();
        } else if (this.isFalling && this.isLeft) {
          this.drawJumpingLeft();
        } else if (this.isLeft) {
          this.drawWalkingLeft();
        } else if (this.isRight) {
          this.drawWalkingRight();
        } else if (this.isPlummeting) {
          this.drawPlummeting();
        } else if (this.isJumping()) {
          this.drawJumpingRight();
        } else {
          this.drawFront();
        }
        this.update();
      };
      this.update = function () {
        if (this.worldX + 128 >= world.flag.x) {
          world.flag.isFound = true;
          winner = true;
          return;
        }
        if (this.isLeft) {
          if (this.x > this.minX) {
            this.x -= 5;
          } else {
            world.scroll += 5;
          }
        }
        if (this.isRight) {
          if (this.x < this.maxX) {
            this.x += 5;
          } else {
            world.scroll -= 5;
          }
        }
        if (this.isJumping()) {
          this.y += 3;
          this.isFalling = true;
          if (!assets.sounds.characterJump.wasPlayed) {
            assets.sounds.characterJump.play();
            assets.sounds.characterJump.wasPlayed = true;
          }
        } else {
          assets.sounds.characterJump.wasPlayed = false;
          this.isFalling = false;
        }
        if (this.overCanyon() && !this.isJumping() && !DISABLE_FALL) {
          this.isPlummeting = true;
        } else {
          this.isPlummeting = false;
        }
        if (this.isPlummeting) {
          if (!assets.sounds.characterFall.wasPlayed) {
            assets.sounds.characterFall.play();
            assets.sounds.characterFall.wasPlayed = true;
          }
          this.isLeft = false;
          this.isRight = false;
          this.y += 5;
        } else {
          assets.sounds.characterFall.wasPlayed = false;
        }
        if (this.y > world.h + 100) {
          this.isPlummeting = false;
          newTurn();
        }
        this.checkCollectables();
        this.worldX = this.x - world.scroll;
      };
      this.overCanyon = function () {
        var canyon;
        for (var i = 0; i < world.canyons.length; i += 1) {
          canyon = world.canyons[i];
          if (this.isRight) {
            if (
              this.worldX + 10 > canyon.x &&
              this.worldX < canyon.x + canyon.w - 50
            ) {
              return true;
            }
          } else if (this.isLeft) {
            if (
              this.worldX < canyon.x + canyon.w - 75 &&
              this.worldX > canyon.x
            ) {
              return true;
            }
          } else if (this.isPlummeting) {
            return true; // HACK!
          }
        }
        return false;
      };
      this.checkCollectables = function () {
        var collectable;
        for (var i = 0; i < world.collectables.length; i += 1) {
          collectable = world.collectables[i];
          if (
            this.worldX > collectable.x - 10 &&
            this.worldX < collectable.x + 10 &&
            !collectable.isFound
          ) {
            collectable.isFound = true;
            if (!assets.sounds.treasureFound.wasPlayed) {
              assets.sounds.treasureFound.play();
              assets.sounds.treasureFound.wasPlayed = true;
            }
            score += 1000;
            return true;
          }
        }
        assets.sounds.treasureFound.wasPlayed = false;
        return false;
      };
      this.isJumping = function () {
        return this.y < world.floor;
      };
      return this;
    }
  }

  // ======================================================================
  //  Tree
  // ======================================================================
  class Tree {
    constructor(x, height) {
      this.x = x;
      this.h = height;
      this.index = treeCounter % assets.other.trees.length;
      treeCounter += 1;
      this.draw = function (y) {
        var tree = assets.other.trees[this.index];
        p.image(tree, this.x, y - tree.height / 3, tree.width / 3, tree.height / 3);
        return;
      };
      return this;
    }
  }

  // ======================================================================
  //  Mountain
  // ======================================================================
  class Mountain {
    constructor(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.w = width;
      this.h = height;
      this.draw = function () {
        p.fill(120, 120, 120);
        p.triangle(
          this.x,
          this.y,
          this.x + this.w / 2,
          this.y - this.h,
          this.x + this.w,
          this.y
        );
      };
      return this;
    }
  }

  // ======================================================================
  //  Cloud
  // ======================================================================
  class Cloud {
    constructor(x, y, width, height) {
      // Draw natively, instead of using assets
      this.x = x;
      this.y = y;
      this.w = width;
      this.h = height;
      this.draw = function () {
        p.fill(255, 255, 255);
        p.ellipse(this.x, this.y, this.w, this.h);
        p.ellipse(this.x - 40, this.y, this.w - 20, this.h - 20);
        p.ellipse(this.x + 40, this.y, this.w - 20, this.h - 20);
      };
      return this;
    }
  }

  // ======================================================================
  //  Canyon
  // ======================================================================
  class Canyon {
    constructor(x, width) {
      this.x = x;
      this.w = width;
      this.draw = function () {
        // Draw natively, instead of using assets
        p.fill(120, 120, 120);
        p.rect(this.x, world.floor, this.w, world.h - world.floor);
        p.fill(100, 100, 100);
        p.rect(this.x + 3, world.floor, this.w - 6, world.h - world.floor - 3);
        p.fill(80, 80, 80);
        p.rect(this.x + 6, world.floor, this.w - 12, world.h - world.floor - 6);
      };
      return this;
    }
  }

  // ======================================================================
  //  Flag
  // ======================================================================
  class Flag {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.isFound = false;
      this.draw = function () {
        if (!this.isFound) {
          p.fill(255, 255, 255);
          p.rect(this.x - 2, this.y - 300, 4, 300);
        } else {
          p.fill(255, 255, 255);
          p.rect(this.x - 2, this.y - 300, 4, 300);
          p.fill(0, 0, 255);
          p.triangle(
            this.x + 2,
            this.y - 300,
            this.x + 50,
            this.y - 275,
            this.x + 2,
            this.y - 250
          );
        }
      };
      return this;
    }
  }

  // ======================================================================
  //  Collectable
  // ======================================================================
  class Collectable {
    constructor(x, y, size) {
      this.x = x;
      this.y = y;
      this.size = size;
      this.isFound = false;
      this.draw = function (y) {
        if (this.isFound) {
          return;
        }
        p.image(assets.other.key, this.x, this.y, 139, 67);
        return;
      };
      return this;
    }
  }

  // ======================================================================
  //  p5.js functions and event handlers
  // ======================================================================

  // eslint-disable-next-line no-unused-vars
  p.preload = function () {
    // Load graphic assets
    assets = {
      character: {
        front: p.loadImage("assets/Armature_idle-1_0.png"),
        walk: p.loadImage("assets/Armature_walk_01.png"),
        fall: p.loadImage("assets/Armature_fall-1_00.png"),
        jump: p.loadImage("assets/Armature_jump_08.png")
      },
      background: {
        1: p.loadImage("assets/Background.png"),
        2: p.loadImage("assets/BackMountains.png"),
        3: p.loadImage("assets/Mountains 4.png")
      },
      other: {
        key: p.loadImage("assets/key.png"),
        trees: [
          p.loadImage("assets/tree0.png"),
          p.loadImage("assets/tree1.png"),
          p.loadImage("assets/tree2.png")
        ]
      },
      sounds: {
        characterFall: p.loadSound("assets/wilhelm.mp3"),
        characterJump: p.loadSound("assets/jump.mp3"),
        treasureFound: p.loadSound("assets/coin.wav"),
        background: p.loadSound("assets/background.mp3", function () {
          assets.sounds.background.setVolume(0.2);
          assets.sounds.background.loop();
        })
      }
    };
    assets.sounds.characterFall.wasPlayed = false;
    assets.sounds.characterJump.wasPlayed = false;
    assets.sounds.treasureFound.wasPlayed = false;
  }

  p.setup = function () {
    var floorHeight = (H * 3) / 4;

    p.createCanvas(W, H);
    world = new World(W, H, floorHeight);
    char = new Character(W / 2, floorHeight, W * 0.2, W * 0.8);
  }

  // eslint-disable-next-line no-unused-vars
  p.draw = function () {
    world.draw();

    if (lives == 0) {
      p.textSize(32);
      p.fill(255, 0, 0);
      p.text("Game Over", W / 2 - 100, 100);
    } else if (winner) {
      p.textSize(64);
      p.fill(0, 255, 0);
      p.text("You Win!", W / 2 - 100, 100);
    } else {
      p.textSize(16);
      p.fill(0, 0, 0);
      p.text("Lives: " + lives, W - 100, 20);
      char.draw();
    }

    p.textSize(16);
    p.fill(0, 0, 0);
    p.text("Score: " + score, 20, 20);
  }

  // eslint-disable-next-line no-unused-vars
  p.keyPressed = function () {
    if (p.key === "A" || p.keyCode === 37) {
      char.isLeft = true;
    }

    if (p.key === "D" || p.keyCode === 39) {
      char.isRight = true;
    }

    if (p.keyCode == 32 && char.y >= world.floor) {
      // space
      char.y -= 100;
    }
  }

  // eslint-disable-next-line no-unused-vars
  p.keyReleased = function () {
    if (p.key === "A" || p.keyCode === 37) {
      char.isLeft = false;
    }

    if (p.key === "D" || p.keyCode === 39) {
      char.isRight = false;
    }
  }
};

let myp5 = new p5(sketch);

