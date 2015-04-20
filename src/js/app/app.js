/* global initElectionNav */
define([
    'text!templates/main.html',
    'ractive',
    'rvc!components/advert',
    'rvc!components/policy-grid',
    'rvc!components/sticky-bar',
    'pegasus'
], function(
    mainTemplate,
    Ractive,
    Advert,
    PolicyGrid,
    StickyBar,
    pegasus
) {
    'use strict';

    var POSTCODE_URL = 'http://interactive.guim.co.uk/2015/general-election/postcodes/';

    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

    // requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel

    // MIT license

    (function() {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                       || window[vendors[x]+'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                  timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };

        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    }());

    function getOffset(el) {
        return el ? el.offsetTop + getOffset(el.offsetParent) : 0;
    }

    var scrollTo = (function () {
        var scrollTimer, interval = 15, total = 300;

        return function (end) {
            var start = window.pageYOffset;
            var distance = end - start;
            var elapsed = 0;

            scrollTimer = window.requestAnimationFrame(function scrollHandler() {
                window.scrollTo(0, Math.floor(start + distance * (elapsed / total)));
                if (elapsed === total) {
                    scrollTimer = undefined;
                } else {
                    elapsed += interval;
                    scrollTimer = window.requestAnimationFrame(scrollHandler);
                }
            });
        };
    })();

    function debounce(fn) {
        var timer, run;

        return function runner() {
            if (timer) {
                run = true;
            } else {
                fn();
                timer = setTimeout(function () {
                    timer = undefined;
                    if (run) {
                        run = false;
                        runner();
                    }
                }, 100);
            }
        };
    }

    function share(network, extra) {
        var twitterBaseUrl = 'https://twitter.com/intent/tweet?text=';
        var twitterMessage = (extra || '') + 'Will their policies work for you? #ge15';
        var facebookBaseUrl = 'https://www.facebook.com/sharer/sharer.php?ref=responsive&u=';
        var googleBaseUrl = 'https://plus.google.com/share?url=';
        var emailSubject = 'Will their policies work for you?';
        var url = encodeURIComponent(window.location.href);
        var shareWindow;

        if (network === 'twitter') {
            shareWindow = twitterBaseUrl + encodeURIComponent(twitterMessage + ' ') + url;
        } else if (network === 'facebook') {
            shareWindow = facebookBaseUrl + url;
        } else if (network === 'email') {
            shareWindow = 'mailto:?subject=' + encodeURIComponent(emailSubject) + '&body=' + url;
        } else if (network === 'google') {
            shareWindow = googleBaseUrl + url;
        }

        window.open(shareWindow, network + 'share', 'width=640,height=320');
    }

    function getConstituency(postcode, success, error) {
        pegasus(POSTCODE_URL + postcode.replace(/ /g, '').toUpperCase()).then(function (_, xhr) {
            success(xhr.responseText);
        }, error);
    }

    function start(el, areas, questions, constituencies) {
        var questionBarEle;

        var ractive = new Ractive({
            'el': el,
            'template': mainTemplate,
            'components': {
                'advert': Advert,
                'policy-grid': PolicyGrid,
                'sticky-bar': StickyBar
            },
            'data': {
                'mode': window.location.hash === '#explore' ? 'explore' : 'basic',
                'modeOpacity': 1,
                'areas': areas,
                'questions': questions
            },
            'computed': {
                'questionsAnswered': function () {
                    return this.get('questions').filter(function (question) {
                        return question.answers.reduce(function (hasAnswer, answer) {
                            return hasAnswer || answer.selected;
                        }, false);
                    });
                },
                'userPolicyCount': function () {
                    return this.get('questionsAnswered').reduce(function (len, question) {
                        return len + question.answers.filter(function (answer) {
                            return answer.selected;
                        }).reduce(function (policyCount, answer) {
                            return policyCount + answer.policies.count;
                        }, 0);
                    }, 0);
                },
                'allPolicyCount': function () {
                    return this.get('areas').reduce(function (len, areas) {
                        return len + areas.policies.length;
                    }, 0);
                }
            },
            'decorators': {
                'section': function (node, context) {
                    node.sectionContext = context;
                    return {'teardown': function () {}};
                }
            }
        });

        questionBarEle = ractive.find('.js-question-bar');

        function getQuestionOffset(questionNo) {
            return getOffset(document.getElementById('question-' + questionNo)) - questionBarEle.clientHeight;
        }

        function closePolicyGrids() {
            ractive.findAllComponents('policy-grid').forEach(function (grid) {
                grid.fire('close');
            });
        }

        ractive.on('question', function (evt, questionNo) {
            closePolicyGrids();
            scrollTo(getQuestionOffset(questionNo));
            return false;
        });

        ractive.on('policies', function () {
            scrollTo(getOffset(document.getElementById('policies')));
            return false;
        });

        ractive.on('mode', function (evt, mode) {
            this.animate('modeOpacity', 0).then(function () {
                ractive.animate('modeOpacity', 1);
                ractive.set('mode', mode);
                closePolicyGrids();
                window.scrollTo(0, 0); // without animation
            });
            return false;
        });

        ractive.on('postcode', function (evt, postcode) {
            getConstituency(postcode, function (ons_id) {
                ractive.set('userConstituency', constituencies[ons_id]);
            }, function () {});
            return false;
        });

        ractive.on('answer', function (evt) {
            var questionNo = evt.index.questionNo;
            var multi = this.get('questions.' + questionNo + '.multi');
            if (!multi) {
                this.set('questions.' + questionNo + '.answers.*.selected', false);
                this.fire('question', undefined, questionNo + 1);
            }

            this.toggle(evt.keypath + '.selected');
            return false;
        });

        ractive.on('share', function (evt, network) { share(network); });

        ractive.on('policy-grid.share', function (evt, network) {
            share(network, '#' + evt.context.party + ': ' + evt.context.policy + '. ');
        });

        ractive.observe('userPolicyCount', function () {
            var el = ractive.find('.policy-summary');
            el.className += ' do-animation';
            setTimeout(function () {
                el.className = el.className.replace(/do-animation/g, '').trim();
            }, 300);
        }, {'init': false});

        (function () {
            var sections = ractive.findAll('.question, .you-said', {'live': true});

            document.addEventListener('scroll', debounce(function () {
                var i, offset = window.pageYOffset;

                for (i = sections.length - 1; i >= 0; i--) {
                    if (offset >= getOffset(sections[i])) {
                        ractive.set('currentSection', sections[i].sectionContext);
                        return;
                    }
                }

                ractive.set('currentSection', undefined);
            }));
        })();

        initElectionNav("pollprojection");
    }

    return {
        'start': start
    };
});
