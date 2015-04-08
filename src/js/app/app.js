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

    function start(el, policies, questions, areas) {
        var questionBarEle, questionEles, policyGridEle;

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
                'questions': questions,
                'areas': areas,
                'parties': ['Labour', 'SNP', 'Green', 'UKIP', 'LD', 'Conservatives'].map(function (party) {
                    return {
                        'party': party,
                        'only': false
                    };
                }),
                'userAnswers': []
            },
            'computed': {
                'userPolicyCount': function () {
                    return this.get('userAnswers').reduce(function (len, answer) {
                        return len + answer.policies.length;
                    }, 0);
                }
            }
        });

        questionBarEle = ractive.find('.js-question-bar');
        questionEles = ractive.findAll('.question');
        policyGridEle = ractive.find('.js-policy-grid');

        function getQuestionOffset(questionNo) {
            return getOffset(questionEles[questionNo]) - questionBarEle.clientHeight;
        }

        function gotoQuestion(questionNo) {
            scrollTo(getQuestionOffset(questionNo));
        }

        function gotoPolicyGrid() {
            scrollTo(getOffset(policyGridEle));
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
            gotoPolicyGrid();
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
                gotoPolicyGrid();
            } else {
                gotoQuestion(questionNo + 1);
            }
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

            if (offset < getOffset(policyGridEle)) {
                questionEles.forEach(function (question, questionNo) {
                    if (offset >= getQuestionOffset(questionNo)) {
                        currentSection = questionNo;
                    }
                });
            }

            ractive.set('currentSection', currentSection);
        });
    }

    return {
        'start': start
    };
});
