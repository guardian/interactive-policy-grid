define([
    'iframe-messenger',
    'text!templates/main.html',
    'ractive',
    'policy-grid',
    'pegasus',
    'classList' // polyfill for IE9
], function(
    iframeMessenger,
    mainTemplate,
    Ractive,
    PolicyGrid,
    pegasus
) {
    'use strict';

    var MAX_ANSWERS = 4;
    var SHEET_URL = 'http://interactive.guim.co.uk/spreadsheetdata/1FH1NEYStgczP_B4xPPMr3_DuXHBAipkn2S0zhcFH_LU.json';

    function debounce(fn, delay) {
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
                }, delay);
            }
        };
    }

    function getOffset(el) {
        return el ? el.offsetTop + getOffset(el.offsetParent) : 0;
    }

    // TODO: add animation
    function scrollTo(y) {
        window.scrollTo(0, y);
    }

    Array.prototype.flatMap = function (fn) {
        return this.map(fn).reduce(function (a, b) { return a.concat(b); });
    };

    function app(el, policies, questions, tags) {
        var topbarEle, questionEles, policyGridEle;
        var ractive = new Ractive({
            'el': el,
            'template': mainTemplate,
            'components': {
                'policy-grid': PolicyGrid
            },
            'data': {
                'mode': window.location.hash === '#explore' ? 'explore' : 'basic',
                'policies': policies,
                'questions': questions,
                'tags': tags,
                'parties': ['Labour', 'SNP', 'Green', 'Ukip', 'Lib Dem', 'Conservatives'].map(function (party) {
                    return {
                        'party': party,
                        'only': false
                    };
                }),
                'userAnswers': []
            },
            'computed': {
                'visibleTags': function () {
                    return this.get('userAnswers').flatMap(function (answer) { return answer.tags; });
                },
                'userPolicies': function () {
                    var visibleTags = this.get('visibleTags');
                    return this.get('policies').filter(function (policy) {
                        return policy.tags.reduce(function (show, tag) {
                            return show || visibleTags.indexOf(tag) !== -1;
                        }, false);
                    });
                },
                'allPolicies': function () {
                    var parties = this.get('parties');
                    //var allParties = !parties.reduce(function (only, party) { return only || party.only; }, false);
                    return this.get('policies');
                }
            }
        });

        topbarEle = ractive.find('.top-bar');
        questionEles = ractive.findAll('.question');
        policyGridEle = ractive.find('.policy-title--grid');

        function getScrollOffset(ele) {
            return getOffset(ele) - topbarEle.clientHeight;
        }

        ractive.on('question', function (evt) {
            scrollTo(getScrollOffset(questionEles[evt.index.questionNo]));
        });

        ractive.on('policies', function () {
            scrollTo(getScrollOffset(policyGridEle));
        });

        ractive.on('answer', function (evt) {
            evt.original.preventDefault();
            this.set('userAnswers.' + evt.index.questionNo, evt.context);
        });

        ractive.observe('userPolicies', function () {
            var el = ractive.find('.top-bar__block--policies');
            el.classList.add('is-flash');
            setTimeout(function () {
                el.classList.remove('is-flash');
            }, 300);

        }, {
            'init': false,
            'defer': true
        });

        document.addEventListener('scroll', (function () {
            var topbarX;

            return debounce(function () {
                var offset = window.pageYOffset;
                var currentSection = -1;

                if (offset >= getScrollOffset(policyGridEle)) {
                    currentSection = questionEles.length;
                } else {
                    questionEles.forEach(function (question, questionNo) {
                        if (offset >= getScrollOffset(question)) {
                            currentSection = questionNo;
                        }
                    });
                }

                ractive.set('currentSection', currentSection);

                if (topbarEle.className.indexOf('is-sticky') === -1) {
                    topbarX = getOffset(topbarEle);
                }
                topbarEle.className = offset >= topbarX ? 'top-bar is-sticky' : 'top-bar';
            }, 100);
        })());

        window.addEventListener('hashchange', function () {
            ractive.set('mode', window.location.hash === '#explore' ? 'explore' : 'basic');
        });
    }

    function init(el) {
        iframeMessenger.enableAutoResize();

        function parseTags(tagString) {
            return tagString.split(',')
                .map(function (tag) { return tag.trim(); })
                .filter(function (tag) { return tag.length > 0; });
        }

        pegasus(SHEET_URL).then(function (spreadsheet) {
            var policies = spreadsheet.sheets.policies.map(function (policy) {
                policy.tags = parseTags(policy.willtags); // TODO
                return policy;
            });

            var questions = spreadsheet.sheets.questions.map(function (question) {
                var i, s, answers = [];
                for (i = 0; i < MAX_ANSWERS; i++) {
                    s = 'answer' + (i + 1);
                    if (question[s]) {
                        answers[i] = {
                            'answer': question[s],
                            'tags': parseTags(question[s + 'tags']),
                            'img': question[s + 'image']
                        };
                    }
                }

                return {
                    'question': question.question,
                    'theme': question.theme,
                    'answers': answers
                };
            });

            var tags = spreadsheet.sheets.tags.map(function (tag) {
                return {
                    'area': tag.area,
                    'tags': parseTags(tag.tags).map(function (tag) {
                        return {
                            'tag': tag,
                            'only': false
                        };
                    })
                };
            });

            try {
                app(el, policies, questions, tags);
            } catch (e) {
                console.log(e);
            }
        });
    }

    return {
        init: init
    };
});
