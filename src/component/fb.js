/**
 * @file fb api
 */
let uid;
let accessToken;
let appId = '1767865813510755';
// appId = '970581573082196';

let alertPanel;
let callbacks;

/* globals alertPanel*/
/* globals FB*/
let friendCache = {
    me: {},
    user: {},
    permissions: [],
    friends: [],
    invitableFriends: [],
    apprequests: [],
    scores: [],
    games: [],
    reRequests: {}
};

export function init(alertPanel1, callbacks1) {
    callbacks = callbacks1;
    alertPanel = alertPanel1;
    (function (d, s, id) {
        let js;
        let fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) {
            return;
        }
        js = d.createElement(s);
        js.id = id;
        js.src = '//connect.facebook.net/en_US/sdk.js';
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
    window.fbAsyncInit = () => {
        FB.init({
            appId: appId,
            cookie: true,
            xfbml: true,
            version: 'v2.10'
        });
        FB.AppEvents.logPageView();
        // login(loginCallback);
        FB.getLoginStatus(response => {
            if (response.status === 'connected') {
                getMe(() => {
                    if (friendCache['me']['score']) {
                        let score = friendCache['me']
                            && friendCache['me']['score']
                            && friendCache['me']['score']['data']
                            && friendCache['me']['score']['data'][0]
                            && friendCache['me']['score']['data'][0]['score'];
                        if (callbacks['setBestScore'] && score) {
                            callbacks['setBestScore'](score);
                        }
                    }
                });
            }
        });
        FB.AppEvents.logPageView();
        // 监听状态权限改变
        FB.Event.subscribe('auth.authResponseChange', onAuthResponseChange);
        FB.Event.subscribe('auth.statusChange', onStatusChange);
    };
}

function getFriendCacheData(endpoint, callback, options) {
    if (endpoint) {
        let url = '/';
        if (endpoint === 'me') {
            url += endpoint;
        } else if (endpoint === 'scores') {
            url += appId + '/' + endpoint;
        } else {
            url += 'me/' + endpoint;
        }
        FB.api(url, options, response => {
            if (!response.error) {
                console.log('getFriendCacheData', endpoint, response);
                friendCache[endpoint] = response.data ? response.data : response;
                if (callback) {
                    callback();
                }
            } else {
                console.error('getFriendCacheData', endpoint, response);
            }
        });
    } else {
        getMe(() => {
            getPermissions(() => {
                getFriends(() => {
                    getInvitableFriends(() => {
                        getScores(callback);
                    });
                });
            });
        });
    }
}

function getMe(callback) {
    getFriendCacheData('me', callback, {
        fields: 'id,name,first_name,picture.width(120).height(120),score'
    });
}

function getFriends(callback) {
    getFriendCacheData('friends', callback, {
        fields: 'id,name,first_name,picture.width(120).height(120)',
        limit: 8
    });
}

function login(callback) {
    FB.login(callback, {
        scope: 'user_friends,publish_actions',
        return_scopes: true
    });
}

function loginCallback(response) {
    console.log('loginCallback', response);
    if (response.status !== 'connected') {
        // top.location.href = appCenterURL;
    }
}

function reRequest(scope, callback) {
    FB.login(callback, {
        scope: scope,
        auth_type: 'rerequest'
    });
}

function getPermissions(callback) {
    getFriendCacheData('permissions', callback);
}

function hasPermission(permission) {
    for (let i in friendCache.permissions) {
        if (friendCache.permissions[i].permission === permission
            && friendCache.permissions[i].status === 'granted') {
            return true;
        }
    }
    return false;
}

function getInvitableFriends(callback) {
    getFriendCacheData('invitableFriends', callback, {
        fields: 'name,first_name,picture',
        limit: 8
    });
}

function getScores(callback) {
    getFriendCacheData('scores', callback, {
        fields: 'score,user.fields(first_name,name,picture.width(120).height(120))'
    });
}

function onAuthResponseChange(response) {
    console.log('onAuthResponseChange', response);
    if (response.status === 'connected') {
        getPermissions();
    }
}

function onStatusChange(response) {
    console.log('onStatusChange', response);
    if (response.status !== 'connected') {
        login(loginCallback);
    } else {
        getMe(() => {
            if (friendCache['me']['score']) {
                let score = friendCache['me']
                    && friendCache['me']['score']
                    && friendCache['me']['score']['data']
                    && friendCache['me']['score']['data'][0]
                    && friendCache['me']['score']['data'][0]['score'];
                if (callbacks['setBestScore'] && score) {
                    callbacks['setBestScore'](score);
                }
            }
            getPermissions(() => {
                if (hasPermission('user_friends')) {
                    getScores(() => {
                        // renderWelcome();
                        // onLeaderboard();
                        // showHome();
                        // urlHandler(window.location.search);
                    });
                } else {
                    // renderWelcome();
                    // showHome();
                    // urlHandler(window.location.search);
                }
            });
        });
    }
}

// post
export let sendScore = (() => {
    function __sendScore(score) {
        FB.api('/me/scores', response => {
            let bestscore = response.data
                && response.data[0]
                && response.data[0].score;

            if (bestscore >= score) {
                callbacks['setBestScore'](bestscore);
                console.log('Lower score not posted to Facebook', score, response);
            } else {
                FB.api('/me/scores', 'post', {
                    score: score
                }, response => {
                    if (response.error) {
                        alertPanel.show('Send Score to facebook failed.', 1000);
                        console.error('sendScore failed', score, response);
                    } else {
                        if (callbacks['setBestScore'] && score) {
                            callbacks['setBestScore'](score);
                        }
                        console.log('Score posted to Facebook', score, response);
                    }
                });
            }
        });
    }
    return (score, callback) => {
        if (!hasPermission('publish_actions')
            && !friendCache.reRequests['publish_actions']) {
            alertPanel.show('Do you want to publish your scores to Facebook?', 0,
                response => {
                    friendCache.reRequests['user_friends'] = true;
                    reRequest('publish_actions', () => {
                        getPermissions(() => {
                            __sendScore(score, callback);
                        });
                    });
                });
        } else {
            __sendScore(score, callback);
        }
        typeof callback === 'function' && callback();
    };
})();
