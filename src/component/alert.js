/**
 * @file 提醒面板
 */
'use strict';
import React from 'react';
import ReactDOM from 'react-dom';

export default class AlertPanel extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            'show': 0,
            'confirmBtnShow': 1
        };
        this.hide = this.hide.bind(this);
        this.show = this.show.bind(this);
    }

    hide(e) {
        if ((e && e.target && e.target.getAttribute('data-hide')) || e === 0) {
            e.stopPropagation && e.stopPropagation();
            this.setState({
                'show': 0
            });
            if (typeof this.cancelCallback === 'function') {
                setTimeout(() => {
                    this.cancelCallback();
                });
            }
        }
    }

    confirm() {
    }

    show(text, timeout, callback, cancelCallback) {

        this.setState({
            'text': text,
            'show': 1,
            'confirmBtnShow': 0
        });

        this.cancelCallback = cancelCallback;

        if (timeout) {
            setTimeout(()=> {
                this.hide(0);
                typeof callback === 'function' && callback();
            }, timeout);
        } else if (typeof callback === 'function') {
            this.confirm = () => {
                callback();
                this.setState({
                    'show': 0
                });
            };
            this.setState({
                confirmBtnShow: 1
            });
        }
    }

    render() {
        return <div data-hide="1" className="alertPanelOverlay" style={this.state.show
                ? {display: 'block'} : {display: 'none'}} onClick={this.hide}>
            <div className="alertPanel">
                <div data-hide="1" className="closeBtn">
                    <svg xmlns="http://www.w3.org/2000/svg" height="15" width="16">
                        <path d="M4.25,3.25l8.5,8.5M12.75,3.25l-8.5,8.5"
                            stroke="#322b24" strokeWidth="1.25"/>
                    </svg>
                    <div data-hide="1" className="closeBtnCover"></div>
                </div>
                <p className="desc">{this.state.text || ''}</p>
                <div className="confirmBtn" style={this.state.confirmBtnShow
                    ? {display: 'block'} : {display: 'none'}} onClick={this.confirm}>
                    confirm
                </div>
            </div>
        </div>;
    }
}