/**
 * @file main entry
 */
'use strict';
import React from 'react';
import ReactDOM from 'react-dom';
import '../css/main.less';
import * as MyFB from '../component/fb.js';
import AlertPanel from '../component/alert.js';

/* globals FB*/

// let canvas;
let blockCtx;
let ballCtx;
let wallCtx;
let BoardLeft;
let BoardWidth;
let BoardHeight;
const BG_COLOR = '#333';
const BALL_BOTTOM = 100;
const LOOP_DT = 16;
const SET_BLOCK_DT = 2000;
let alertPanel;

class Sound extends React.Component {
    constructor(props) {
        super(props);
        if (!Sound.allSounds) {
            Sound.support = (() => {
                let elem = document.createElement('audio');
                return elem.canPlayType('audio/ogg') || elem.canPlayType('audio/mp3');
            })();
            Sound.soundOn = Sound.support ? 1 : 0;
            Sound.musicOn = Sound.support ? 1 : 0;
            Sound.allSounds = {
                explosionSound: document.getElementById('explosionSound'),
                loseSound: document.getElementById('loseSound'),
                backSound: document.getElementById('backSound')
            };
            Sound.allSounds.backSound.volume = 0.2;
        }
    }

    changeSoundOn(e) {
        Sound.soundOn = !!e.target.checked;
        !Sound.soundOn && this.stopSound();
    }
    changeMusicOn(e) {
        Sound.musicOn = !!e.target.checked;
        !Sound.musicOn && this.stopMusic();
    }

    static get audioTracks() {
        return [new Audio(), new Audio(), new Audio()];
    }

    soundIsPlaying(sound) {
        return !sound.ended && sound.currentTime > 0;
    }

    playSound(sound) {
        if (!Sound.support) {
            return;
        }
        let track;
        if (Sound.soundOn) {
            if (!this.soundIsPlaying(sound)) {
                sound.play();
            } else {
                for (let index = 0; index < Sound.audioTracks.length; ++index) {
                    track = Sound.audioTracks[index];

                    if (!this.soundIsPlaying(track)) {
                        track.src = sound.currentSrc;
                        track.load();
                        track.volume = sound.volume || 1;
                        track.play();
                        break;
                    }
                }
            }
        }
    }
    stopSound() {
        if (!Sound.support) {
            return;
        }
        for (let index = 0; index < Sound.audioTracks.length; ++index) {
            let sound = Sound.audioTracks[index];
            if (this.soundIsPlaying(sound)) {
                sound.pause();
                sound.currentTime = 0;
            }
        }
    }

    playMusic() {
        if (!Sound.support) {
            return;
        }
        if (Sound.musicOn) {
            let sound = Sound.allSounds.backSound;
            if (!this.soundIsPlaying(sound)) {
                sound.play();
            } else {
                let track = new Audio();
                if (!this.soundIsPlaying(track)) {
                    track.src = sound.currentSrc;
                    track.load();
                    track.volume = sound.volume;
                    track.play();
                }
            }
        }
    }

    stopMusic() {
        if (!Sound.support) {
            return;
        }
        let sound = Sound.allSounds.backSound;
        sound.pause();
        sound.currentTime = 0;
    }

    render() {
        return Sound.support ? <div className="soundControl">
            <label>
                Sound&nbsp;
                <input type='checkbox' defaultChecked={true}
                    onChange={e => {this.changeSoundOn(e);}}/>
            </label>
            <label>
                Music&nbsp;
                <input type='checkbox' defaultChecked={true}
                    onChange={e => {this.changeMusicOn(e);}}/>
            </label>
        </div> : null;
    }
}

/*
 ** 球
 */
class Ball {
    constructor() {
        this.noleft = 0;
        this.noright = 0;
        this.x = BoardWidth / 2;
        this.y = BoardHeight - BALL_BOTTOM;
        this.r = BoardWidth / 15;
        this.num = 3;
        if (!ballCtx.setFont) {
            ballCtx.setFont = 1;
            ballCtx.textAlign = 'center';
            ballCtx.textBaseline = 'middle';
            ballCtx.font = this.r + 'px Arial';
        }
        this.cursor = 'pointer';
        this.draw();
        this.resetDirection = this.resetDirection.bind(this);
    }

    clear() {
        ballCtx.clearRect(0, 0, BoardWidth, BoardHeight);
    }

    checkCollision(sqX, sqY, sqWidth) {
        if ((sqY + sqWidth < this.y - this.r)
            || (sqY > this.y + this.r)) {
            return false;
        }
        if ((sqX + sqWidth < sqX - this.r)
            || (sqX > sqX + this.r)) {
            return false;
        }

        let tan = (sqY - this.y) / (sqX - this.x);
        let offsetX = Math.sqrt(Math.pow(this.r, 2) / (1 + Math.pow(tan, 2)), 2);
        let offsetY = offsetX * tan;

        let borderX = sqX > this.x ? (this.x + offsetX) : (this.x - offsetX);
        let borderY = sqY > this.Y ? (this.y + offsetY) : (this.y - offsetY);

        if (borderX >= sqX && borderY >= sqY
            && borderX <= sqX + sqWidth && borderY <= sqY + sqWidth) {
            return true;
        } else {
            return false;
        }
    }

    handleHitWall(wall) {
        if (wall.y2 < this.y - this.r || wall.y1 > this.y + this.r) {
            this.resetDirection();
            return false;
        } else {
            if (this.x < wall.x + this.r && this.x > wall.x - this.r) {
                if (wall.x < this.x) {
                    this.moveTo(wall.x + this.r);
                    this.noleft = 1;
                } else {
                    this.moveTo(wall.x - this.r);
                    this.noright = 1;
                }
                return true;
            }
        }
        // this.resetDirection();
        return false;
    }

    resetDirection() {
        this.noleft = 0;
        this.noright = 0;
    }

    draw() {
        ballCtx.fillStyle = 'yellow';
        ballCtx.beginPath();
        ballCtx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
        ballCtx.fill();
        ballCtx.fillStyle = 'black';
        ballCtx.fillText(this.num, this.x, this.y, this.r * 2);
    }

    moveTo(x) {
        if (this.x !== x) {
            if (x > BoardWidth || x < - this.r) {
                return false;
            } else {
                this.x = x;
                this.clear();
                this.draw();
                return true;
            }
        }
    }
}

/*
 ** 方块
 */
class Block {
    constructor(num, xIndex = 0, yIndex = -1) {
        this.width = BoardWidth / 5;
        this.x = xIndex * this.width;
        this.y = yIndex * this.width;
        this.num = parseInt(num, 10);
        this.color = this.getFillColor();
        if (!blockCtx.setFont) {
            blockCtx.setFont = 1;
            blockCtx.font = this.width / 2 + 'px Arial';
            blockCtx.textAlign = 'center';
            blockCtx.textBaseline = 'middle';
        }
        this.draw();
    }

    static get colors() {
        // return ['#f5deb3', '#46ff05', '#00bf87', '#008dbf', '#0058bf',
        //     '#2300bf', '#9f00bf', '#bf0049', '#c11818', '#fff'];
        return ['#ffe9c7', '#fffdc7', '#efffc7', '#d2ffc7', '#c7ffe5',
            '#c7fcff', '#c7d8ff', '#e2c7ff', '#fec7ff', '#ffc7de'];
    }

    getFillColor() {
        // let index = parseInt(this.num / 15, 10);
        let index = parseInt(10 * Math.random(), 10);
        index > 9 && (index = 9);

        return Block.colors[index];
    }

    draw() {
        blockCtx.fillStyle = this.color;
        blockCtx.roundRect(this.x, this.y, this.width, this.width, 10, 1);
        blockCtx.fillStyle = 'black';
        blockCtx.fillText(this.num, this.x + this.width / 2, this.y + this.width / 2, this.width);
    }

    break() {
        let rate = 1;
        return {
            step: () => {
                if (rate > 0.1) {
                    rate = rate * 0.8;
                    blockCtx.fillStyle = this.color;
                    for (let i = 0; i < 50 * rate; i++) {
                        let x = Math.floor(this.x + Math.random() * this.width);
                        let y = Math.floor(this.y + Math.random() * this.width);
                        x > this.x + this.width - 20 && (x = this.x + this.width - 20);
                        y > this.y + this.width - 20 && (y = this.y + this.width - 20);
                        blockCtx.fillRect(
                            Math.floor(this.x + Math.random() * this.width),
                            Math.floor(this.y + Math.random() * this.width),
                            Math.random() * 10, Math.random() * 10);
                    }
                    return true;
                } else {
                    return false;
                }
            }
        };
    }

    step(dt) {
        this.y += BoardWidth / 5 / dt;
        if (this.y > BoardHeight) {
            return false;
        } else {
            this.draw();
            return true;
        }
    }
}

/*
 ** 墙
 */
class Wall {
    constructor(xIndex, yIndex = 0) {
        let width = BoardWidth / 5;
        this.x = xIndex * width;
        this.y1 = yIndex * width;
        // this.y2 = this.y1 + width * 3 * Math.random();
        this.y2 = this.y1 + Wall.dis * Math.random();
        this.draw();
        if (!wallCtx.setStroke) {
            wallCtx.strokeStyle = '#ffc107';
            wallCtx.lineWidth = 2;
            wallCtx.setStroke = 1;
        }
    }

    static get dis() {
        return BoardWidth / 5 / LOOP_DT / LOOP_DT * SET_BLOCK_DT * 0.8;
    }

    draw() {
        wallCtx.beginPath();
        wallCtx.moveTo(this.x, this.y1);
        wallCtx.lineTo(this.x, this.y2);
        wallCtx.stroke();
    }

    step(dt) {
        this.y1 += BoardWidth / 5 / dt;
        if (this.y1 > BoardHeight) {
            return false;
        } else {
            this.y2 += BoardWidth / 5 / dt;
            this.draw();
            return true;
        }
    }
}

class Board extends React.Component {
    constructor(props) {
        super(props);
        let rect = document.getElementById('main').getBoundingClientRect();
        BoardLeft = rect.left;
        BoardWidth = rect.width;
        BoardHeight = rect.height;
        this.loop = this.loop.bind(this);
        this.pauseOrPlay = this.pauseOrPlay.bind(this);
        this.handleCollision = this.handleCollision.bind(this);
        this.initGame = this.initGame.bind(this);
        this.loseGame = this.loseGame.bind(this);
        this.handleMoveEvent = this.handleMoveEvent.bind(this);
        this.pause = 1;
        this.state = {
            score: 0,
            btnText: 'PAUSE'
        };
    }

    initGame() {
        if (!this.InitGameSt) {
            this.InitGameSt = true;
            this.boards = [];
            this.setState({
                score: 0,
                btnText: 'PAUSE',
                loseGame: false
            });
            // 背景
            this.clear();
            this.ball && this.ball.clear();
            this.ball = new Ball();
            // this.stopLoop = 0;
            this.pause = 0;
            this.InitGameSt = false;
            this.soundUtil.playMusic();
        }
    }

    loseGame() {
        this.setState({
            loseGame: true
        });
        if (!this.state.best || this.state.score > this.state.best) {
            MyFB.sendScore(this.state.score, () => {
                this.setState({
                    best: this.state.score
                });
            });
        }
        this.soundUtil.stopMusic();
        this.soundUtil.playSound(Sound.allSounds['loseSound']);
        FB && FB.AppEvents.logEvent('score', this.state.score);
    }

    pauseOrPlay() {
        this.pause = !this.pause;
        this.setState({
            'btnText': this.pause ? 'PLAY' : 'PAUSE'
        });
    }

    handleMoveEvent(nChangX) {
        if (!this.pause) {
            nChangX > BoardWidth - this.ball.r && (nChangX = BoardWidth - this.ball.r);
            nChangX < this.ball.r && (nChangX = this.ball.r);

            if (!(this.ball.noleft && nChangX < this.ball.x)
                && !(this.ball.noright && nChangX > this.ball.x)) {
                this.ball.moveTo(nChangX);
            }
        }
    }

    initEvent() {
        // mobile
        let boardCnt = document.getElementById('blockCanvas');
        let body = document.body;
        let nStartX;
        boardCnt.addEventListener('touchmove', e => {
            let nChangX = e.changedTouches[0].pageX - BoardLeft;
            this.handleMoveEvent(nChangX);
            e.preventDefault();
            e.stopPropagation();
        });

        // pc
        let flag = false;       // 是否按下鼠标的标记
        boardCnt.addEventListener('mousedown', e => {
            flag = true;             // 确认鼠标按下
        });
        boardCnt.addEventListener('mousemove', e => {
            if (flag) {                        // 如果是鼠标按下则继续执行
                let nChangX = e.clientX - BoardLeft;  // 记录鼠标在x轴移动的数据
                this.handleMoveEvent(nChangX);
            }
        });
        boardCnt.addEventListener('mouseup', e => {
            flag = false;                    // 鼠标释放
        });
    }

    componentDidMount() {
        let ballCanvas = document.getElementById('ballCanvas');
        ballCtx = ballCanvas.getContext && ballCanvas.getContext('2d');
        let blockCanvas = document.getElementById('blockCanvas');
        blockCtx = blockCanvas.getContext && blockCanvas.getContext('2d');
        let wallCanvas = document.getElementById('wallCanvas');
        wallCtx = ballCanvas.getContext && wallCanvas.getContext('2d');
        blockCtx.roundRect = this.roundRect;
        if (!ballCtx && !blockCtx) {
            return false;
        }
        ballCtx.fillStyle = BG_COLOR;
        ballCtx.fillRect(0, 0, BoardWidth, BoardHeight);
        // this.initGame();
        this.setBlocks();
        this.loop();
        this.initEvent();

        MyFB.init(alertPanel, {
            'setBestScore': score => {
                score = parseInt(score, 10);
                if (score) {
                    this.setState({
                        'best': score
                    });
                }
            }
        });
    }

    setBlocks() {
        this.__setBlocks(1);
    }

    __setBlocks(first) {
        if (!this.pause) {
            for (let i = 0; i < 5; i++) {
                let isShow = Math.random() > 0.3;
                let blockNum = Math.floor(Math.random() * this.ball.num * 3);
                first && blockNum < 3 && (first = 0);
                if (i === 4 && first) {
                    blockNum = 2;
                }
                if (isShow && blockNum) {
                    this.setBoard(new Block(blockNum, i));
                    i && Math.random() > 0.7 && this.setBoard(new Wall(i));
                }
            }
        }
        setTimeout(() => {
            this.__setBlocks();
        }, SET_BLOCK_DT);
    }

    clear() {
        wallCtx.clearRect(0, 0, BoardWidth, BoardHeight);
        blockCtx.clearRect(0, 0, BoardWidth, BoardHeight);
    }

    loop() {
        let dt = LOOP_DT;
        if (!this.pause) {
            this.clear();
            for (let i = this.boards.length; i >= 0; i--) {
                if (this.boards[i] && this.boards[i].step) {
                    this.boards[i].step(dt) === false
                        && this.delBoard(i);
                    this.handleCollision(this.ball, i);
                }
            }
        }
        setTimeout(this.loop, dt);

    }

    handleCollision(ball, index) {
        // console.log(this.boards[index]);
        if (this.boards[index] instanceof Block) {
            let block = this.boards[index];
            if (this.ball.checkCollision(block.x, block.y, block.width)) {
                if (ball.num > block.num) {
                    ball.num += block.num;
                    this.setState({
                        score: ball.num
                    });
                    this.setBoard(block.break());
                    ball.draw();
                    this.soundUtil.playSound(Sound.allSounds['explosionSound']);
                    this.delBoard(index);
                } else {
                    this.pause = 1;
                    this.loseGame();
                }
            }
        }
        else if (this.boards[index] instanceof Wall) {
            let wall = this.boards[index];
            this.ball.handleHitWall(wall);
        }
    }

    setBoard(board) {
        this.boards.push(board);
    }

    delBoard(index) {
        this.boards.splice(index, 1);
    }

    roundRect(x, y, width, height, radius, fill, stroke) {
        if (typeof stroke === 'undefined') {
            stroke = true;
        }
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
        if (stroke) {
            this.stroke();
        }
        if (fill) {
            this.fill();
        }
    }

    render() {
        return <div>
            <canvas id="wallCanvas" width={BoardWidth} height={BoardHeight}></canvas>
            <canvas id="blockCanvas" width={BoardWidth} height={BoardHeight}></canvas>
            <canvas id="ballCanvas" width={BoardWidth} height={BoardHeight}></canvas>
            <div className="headBar">{this.state.score}
                <a className="playBtn" onClick={this.pauseOrPlay}>{this.state.btnText}</a></div>
            <div className="loseGame overlay" style={this.state.loseGame ? {display: 'block'} : {display: 'none'}}>
                <div style={{width: '100%'}} className="centerMiddle">
                    <p>You Got {this.state.score} Point</p>
                    {this.state.best
                        ? <p style={{fontSize: '0.75em', color: 'red'}}>
                            Best Score: {this.state.best}</p> : null}
                    <a style={{cursor: 'pointer', color: '#fff',
                        background: 'rgb(44, 183, 87)',
                        padding: '5px 15px',
                        borderRadius: '10px'}} onClick={() => {
                            this.initGame();
                            FB && FB.AppEvents.logEvent('replayGame');
                        }}>REPLAY</a>
                    <Sound ref={ref => {this.soundUtil = ref;}}/>
                </div>
            </div>
            <div className="startGame overlay" style={{display: 'block'}} ref={ref => {this.startGamePanel = ref;}}>
                <div style={{width: '100%'}} className="centerMiddle">
                    <p><span style={{color: 'yellow'}}>BALL</span> vs <span style={{color: '#00e7ff'}}>BLOCK</span></p>
                    <p style={{fontSize: '0.75em', padding: '5px 10px'}}>
                        Swipe your finger to guide the ball and break the bricks.
                        Try to break as many bricks as possible to get more score!</p>
                    {this.state.best
                        ? <p style={{fontSize: '0.75em', color: 'red'}}>
                            Best Score: {this.state.best}</p> : null}
                    <a style={{cursor: 'pointer', color: '#fff',
                        background: 'rgb(44, 183, 87)',
                        padding: '5px 15px',
                        borderRadius: '10px'}}
                        onClick={() => {
                            this.initGame();
                            this.startGamePanel.style.display = 'none';
                            FB && FB.AppEvents.logEvent('startGame');
                        }}>Let's START</a>
                    <Sound ref={ref => {this.soundUtil = ref;}}/>
                </div>
            </div>
            <AlertPanel ref={ref => {alertPanel = ref;}} />
        </div>;
    }
}

class Main extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return <div>
            <Board ref={ref => {this.board = ref;}}></Board>
        </div>;
    }
}

ReactDOM.render(<Main/>,
    document.getElementById('main'));