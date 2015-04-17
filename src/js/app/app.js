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

    function getOffset(el) {
        return el ? el.offsetTop + getOffset(el.offsetParent) : 0;
    }

    var scrollTo = (function () {
        var scrollTimer, interval = 15, total = 300;

        return function (end) {
            var start = window.pageYOffset;
            var distance = end - start;
            var elapsed = 0;

            if (scrollTimer) {
                clearInterval(scrollTimer);
            }

            scrollTimer = setInterval(function () {
                window.scrollTo(0, Math.floor(start + distance * (elapsed / total)));
                if (elapsed === total) {
                    clearInterval(scrollTimer);
                    scrollTimer = undefined;
                } else {
                    elapsed += interval;
                }
            }, interval);
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
        var questionBarEle, questionEles, policiesEle, sections;

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
        questionEles = ractive.findAll('.question');
        policiesEle = ractive.find('.js-policies');

        sections = ractive.findAll('.question, .you-said', {'live': true});

        function getQuestionOffset(questionNo) {
            return getOffset(questionEles[questionNo]) - questionBarEle.clientHeight;
        }

        function gotoQuestion(questionNo) {
            scrollTo(getQuestionOffset(questionNo));
        }

        function gotoPolicies() {
            scrollTo(getOffset(policiesEle));
        }

        function closePolicyGrids() {
            ractive.findAllComponents('policy-grid').forEach(function (grid) {
                grid.fire('close');
            });
        }

        ractive.on('question', function (evt, questionNo) {
            closePolicyGrids();
            gotoQuestion(questionNo);
            evt.original.preventDefault();
        });

        ractive.on('policies', function (evt) {
            gotoPolicies();
            evt.original.preventDefault();
        });

        ractive.on('mode', function (evt, mode) {
            if (mode !== this.get('mode')) {
                this.animate('modeOpacity', 0).then(function () {
                    ractive.animate('modeOpacity', 1);
                    ractive.set('mode', mode);
                    closePolicyGrids();
                    window.scrollTo(0, 0); // without animation
                });
            }
            evt.original.preventDefault();
        });

        ractive.on('postcode', function (evt, postcode) {
            getConstituency(postcode, function (ons_id) {
                var answer = {'E': 0, 'S': 1, 'W': 2, 'N': 3};
                var set = {
                    'questions.4.constituency': constituencies[ons_id],
                    'questions.4.answers.*.selected': false,
                };
                set['questions.4.answers.' + answer[ons_id[0]] + '.selected'] = true;
                ractive.set(set);
            }, function () {});
            evt.original.preventDefault();
        });

        ractive.on('changePostcode', function () {
            ractive.set('questions.4.constituency', undefined);
            ractive.set('questions.4.answers.*.selected', false);
        });

        ractive.on('answer', function (evt) {
            var questionNo = evt.index.questionNo;
            var multi = this.get('questions.' + questionNo + '.multi');
            if (!multi) {
                this.set('questions.' + questionNo + '.answers.*.selected', false);

                if (questionNo < questionEles.length - 1) {
                    gotoQuestion(questionNo + 1);
                }
            }

            this.toggle(evt.keypath + '.selected');
            evt.original.preventDefault();
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

        initElectionNav("pollprojection");
    }

    return {
        'start': start
    };
});
