const LIFESPAN = 60;
const THIRD_LIFESPAN = Math.floor(LIFESPAN / 3);
const SHOW_ME = 14000;
const SHOW_OTHERS = 7000;

const START_RADIUS = 30;
const BRUSH_RADIUS = 60;

const text1 = 'אם עץ נופל ביער ואף אחד לא שומע,'.split('').reverse().join('');
const text2 = 'האם הוא השמיע צליל?'.split('').reverse().join('');

let font, audio;
const icons = {}, otherIcons = {};
let brushes = {};
let lastDraw = [-1, -1];

let noiseTextTill = -1;
let playAudioTill = -1;
let isAudioPlaying = false;
let shouldStopAudio = false;

let socket;
let myTag = false;
let myColor = '#000000';
let myIcon = 'bug';

function preload() {
  soundFormats('mp3');
  audio = loadSound('assets/typewriter.mp3');
  font = loadFont('assets/EditorSans-Normal.otf');

  [
    'apple', 'bread', 'bug', 'burger', 'cannon', 'cheese', 'cherry', 'crab', 'dog',
    'goat', 'gun', 'horse', 'monkey', 'octopus', 'ox', 'pig', 'pineapple', 'pizza',
    'rabbit', 'rat', 'rifle', 'rooster', 'shrimp', 'snake', 'spider', 'strawberry', 'sword'
  ]
    .forEach(icon => {
      loadStrings(`assets/icons/${icon}.svg`, strs => {
        const svg = strs.join('').replace('<svg', '<svg fill="#ffffff"').split('#').join('%23');
        icons[icon] = loadImage('data:image/svg+xml;charset=utf-8,' + svg);
      });
    })
}

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);

  textAlign(RIGHT);
  textSize(20);
  textFont(font);

  audio.setVolume(0);
  audio.loop();

  lastDraw = [mouseX, mouseY];

  socket = io.connect(window.location.href);

  // On connection
  socket.on('id', d => {
    myTag = d.tag;
    myIcon = d.icon;
    myColor = d.color;
  });

  // On new particle
  socket.on('circle', d => {
    let brush;
    brush = brushes[d.tag];
    if (!brush) brush = brushes[d.tag] = new Brush(d.tag, d.color, d.icon);

    const x = d.x * window.innerWidth;
    const y = d.y * window.innerHeight;
    brush.add(x, y);
  });
}

function draw() {
  background(255);

  tickInteraction();

  drawBrushes();
  drawText();
  drawCursor();
}

function tickInteraction() {
  if (frameCount % 2 === 0) { // We don't want to draw too much point
    // Did I move since last draw?
    if (mouseX != lastDraw[0] || mouseY != lastDraw[1]) {
      socket.emit('circle', {
        x: mouseX / window.innerWidth,
        y: mouseY / window.innerHeight,
        icon: myIcon,
        tag: myTag,
        color: myColor
      });

      lastDraw = [mouseX, mouseY];
      noiseTextTill = millis() + 200;
      playAudioTill = millis() + 200;
      if (!isAudioPlaying) {
        isAudioPlaying = true;
        audio.play();
        audio.setVolume(0.1, 0.3);
      }
    } else if (isAudioPlaying) {
      // Is stopped and audio still playing?
      isAudioPlaying = false;
      shouldStopAudio = true;
      audio.setVolume(0.0, 0.2);
    }
  }

  // Stop sound after mute
  if (shouldStopAudio && millis() >= playAudioTill) {
    shouldStopAudio = false;
    audio.stop();
  }
}

function drawBrushes() {
  const bs = Object.values(brushes);
  bs.forEach(b => b.tick());
  const shoudlKill = bs.filter(b => b.shoudlKill);
  shoudlKill.forEach(b => {
    delete brushes[b.tag];
  })
}

function drawCursor() {
  noStroke();
  fill(myColor);

  if (millis() > SHOW_ME) {
    ellipse(mouseX, mouseY, 20);
    image(icons[myIcon], mouseX - 6, mouseY - 6, 12, 12);
  } else {
    ellipse(mouseX, mouseY, 3);
  }
}

function drawText() {

  const bx = window.innerWidth - 45;
  const by = 55;

  noStroke();
  fill(255);
  text(text1, bx, by);
  text(text2, bx, by + 28);

  blendMode(EXCLUSION);

  drawTextLayer(bx, by, 0);
  drawTextLayer(bx, by, 1);
  drawTextLayer(bx, by, 2);

  blendMode(BLEND);
}

function drawTextLayer(bx, by, l) {
  fill(l === 0 ? 255 : 0, l === 1 ? 255 : 0, l === 2 ? 255 : 0);
  let nx = 0, ny = 0;
  if (millis() < noiseTextTill) {
    nx = map(noise(frameCount / 15, 0, l), 0, 1, -2, 2);
    ny = map(noise(frameCount / 15, 1, l), 0, 1, -2, 2);
  }
  text(text1, bx + nx, by + ny);
  text(text2, bx + nx, by + 28 + ny);
}

class Brush {

  constructor(tag, color, icon) {
    this.tag = tag;
    this.color = color;
    this.icon = icon;
    this.particles = [];
    this.lastX = 0;
    this.lastY = 0;

    loadStrings(`assets/icons/${icon}.svg`, strs => {
      const svg = strs.join('').replace('<svg', `<svg fill="${color}"`).split('#').join('%23');
      otherIcons[color + icon] = loadImage('data:image/svg+xml;charset=utf-8,' + svg);
    });
  }

  get shoudlKill() {
    return this.particles.length === 0;
  }

  add(x, y) {
    this.lastX = x;
    this.lastY = y;
    this.particles.push(new Particle(x, y));
    this.particles.push(new Particle(x, y));
    this.particles.push(new Particle(x, y));
  }

  tick() {
    this.draw();
    this.clean();
  }

  draw() {
    // Draw Points 
    noFill();
    stroke(this.color);
    this.particles.forEach(p => p.draw());

    // Draw Verts
    this.drawVerts();

    // Draw icon
    if (millis() > SHOW_OTHERS) {
      noStroke();
      fill(255);
      ellipse(this.lastX, this.lastY, 20);
      image(otherIcons[this.color + this.icon], this.lastX - 6, this.lastY - 6, 12, 12);
    }
  }

  drawVerts() {
    let ps;

    for (let age = 0; age < LIFESPAN - THIRD_LIFESPAN; age++) {
      ps = this.particles.filter(p => p.age === age || p.age === age + 2);
      if (ps.length < 6) continue;

      noFill();
      if (age > THIRD_LIFESPAN) {
        const c = color(this.color);
        c.setAlpha(map(age, 0, LIFESPAN, 200, 0));
        stroke(c);
      } else {
        stroke(this.color);
      }

      beginShape();
      vertex(ps[0].currentX, ps[0].currentY);
      vertex(ps[2].currentX, ps[2].currentY);
      vertex(ps[4].currentX, ps[4].currentY);
      vertex(ps[0].currentX, ps[0].currentY);
      endShape();

      beginShape();
      vertex(ps[1].currentX, ps[1].currentY);
      vertex(ps[3].currentX, ps[3].currentY);
      vertex(ps[5].currentX, ps[5].currentY);
      vertex(ps[1].currentX, ps[1].currentY);
      endShape();

      if (age < THIRD_LIFESPAN / 2) {
        noStroke();
        if (age < THIRD_LIFESPAN / 4) {
          fill(this.color);
        } else {
          const c = color(this.color);
          c.setAlpha(map(age, 0, LIFESPAN, 160, 0));
          fill(c);
        }
        beginShape();
        vertex(ps[1].currentX, ps[1].currentY);
        vertex(ps[2].currentX, ps[2].currentY);
        vertex(ps[5].currentX, ps[5].currentY);
        endShape();
      }
    }
  }

  clean() {
    this.particles = this.particles.filter(p => p.age < LIFESPAN);
  }
}

class Particle {
  constructor(x, y) {
    this.startX = floor(x + random(-START_RADIUS, START_RADIUS));
    this.startY = floor(y + random(-START_RADIUS, START_RADIUS));
    this.destX = floor(x + random(-BRUSH_RADIUS, BRUSH_RADIUS));
    this.destY = floor(y + random(-BRUSH_RADIUS, BRUSH_RADIUS));
    this.age = -1;
  }

  get currentX() {
    return map(this.age, 0, LIFESPAN - 1, this.startX, this.destX);
  }

  get currentY() {
    return map(this.age, 0, LIFESPAN - 1, this.startY, this.destY);
  }

  draw() {
    this.age++;
    point(this.currentX, this.currentY);
  }
}