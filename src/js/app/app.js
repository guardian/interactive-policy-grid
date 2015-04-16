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

    function getConstituency(postcode, success, error) {
        pegasus(POSTCODE_URL + postcode.replace(/ /g, '').toUpperCase()).then(function (_, xhr) {
            success(xhr.responseText);
        }, error);
    }

    function start(el, areas, questions, constituencies) {
        var questionBarEle, questionEles, policiesEle;

        var ractive = new Ractive({
            'el': el,
            'template': mainTemplate,
            'components': {
                'advert': Advert,
                'policy-grid': PolicyGrid,
                'sticky-bar': StickyBar
            },
            'partials': {
                'question': ''
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

        ractive.on('postcode', function (evt, postcode) {
            getConstituency(postcode, function (gss) {
                var answer = {'E': 0, 'S': 1, 'W': 2, 'N': 3};
                console.log(constituencies[gss]);
                ractive.set('constituency', constituencies[gss]);
                ractive.set('questions.4.answers.*.selected', false);
                ractive.set('questions.4.answers.' + answer[gss[0]] + '.selected', true);
            }, function () {});
            evt.original.preventDefault();
        });

        ractive.on('answer', function (evt) {
            var questionNo = evt.index.questionNo;
            var multi = this.get('questions.' + questionNo + '.multi');
            if (!multi) {
                this.set('questions.' + questionNo + '.answers.*.selected', false);

                if (questionNo === questionEles.length - 1) {
                    gotoPolicies();
                } else {
                    gotoQuestion(questionNo + 1);
                }
            }

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
        // TODO: debounce
        document.addEventListener('scroll', debounce(function () {
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
        }));

        initElectionNav("pollprojection");
    }

    return {
        'start': start
    };
});
