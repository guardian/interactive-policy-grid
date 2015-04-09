/* global initElectionNav */
define([
    'text!templates/main.html',
    'ractive',
    'rvc!components/advert',
    'rvc!components/policy-grid',
    'rvc!components/sticky-bar'
], function(
    mainTemplate,
    Ractive,
    Advert,
    PolicyGrid,
    StickyBar
) {
    'use strict';

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

    function start(el, areas, questions, interests) {
        var questionBarEle, questionEles, policiesEle;

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
                'questions': questions,
                'interests': interests,
                'parties': ['Labour', 'SNP', 'Green', 'UKIP', 'LD', 'Conservatives'].map(function (party) {
                    return {
                        'party': party,
                        'only': false
                    };
                }),
                'userAnswers': []
            },
            'computed': {
                'userInterests': function () {
                    return this.get('interests').filter(function (interest) { return interest.selected; });
                },
                'userInterestsAndAnswers': function () {
                    return this.get('userAnswers').concat(this.get('userInterests'));
                },
                'userPolicyCount': function () {
                    return this.get('userInterestsAndAnswers').reduce(function (len, answer) {
                        return len + answer.policies.count;
                    }, 0);
                }
            }
        });

        questionBarEle = ractive.find('.js-question-bar');
        questionEles = ractive.findAll('.question');
        policiesEle = ractive.find('.js-policies');

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

        ractive.on('answer', function (evt) {
            var questionNo = evt.index.questionNo;
            this.set('userAnswers.' + questionNo, evt.context);
            if (questionNo === questionEles.length - 1) {
                gotoPolicies();
            } else {
                gotoQuestion(questionNo + 1);
            }
            evt.original.preventDefault();
        });

        ractive.on('interest', function (evt) {
            this.toggle(evt.keypath + '.selected');
            evt.original.preventDefault();
        });

        ractive.observe('userPolicyCount', function () {
            var el = ractive.find('.policy-summary');
            el.className += ' do-animation';
            setTimeout(function () {
                el.className = el.className.replace(/do-animation/g, '').trim();
            }, 300);
        }, {'init': false});

        // TODO: debounce
        document.addEventListener('scroll', function () {
            var offset = window.pageYOffset;
            var currentSection = -1;

            if (offset < getOffset(policiesEle)) {
                questionEles.forEach(function (question, questionNo) {
                    if (offset >= getQuestionOffset(questionNo)) {
                        currentSection = questionNo;
                    }
                });
            }

            ractive.set('currentSection', currentSection);
        });

        initElectionNav("pollprojection");
    }

    return {
        'start': start
    };
});
