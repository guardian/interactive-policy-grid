define([
    'iframe-messenger',
    'text!templates/main.html',
    'text!templates/policyGrid.html',
    'ractive',
    'pegasus',
    'masonry'
], function(
    iframeMessenger,
    mainTemplate,
    policyGridTemplate,
    Ractive,
    pegasus,
    Masonry
) {
    'use strict';

    var MAX_ANSWERS = 5;
    var SHEET_URL = 'http://interactive.guim.co.uk/spreadsheetdata/1FH1NEYStgczP_B4xPPMr3_DuXHBAipkn2S0zhcFH_LU.json';

    Array.prototype.flatMap = function (fn) {
        return this.map(fn).reduce(function (a, b) { return a.concat(b); });
    };

    function parseTags(tagString) {
        return tagString.split(',')
            .map(function (tag) { return tag.trim(); })
            .filter(function (tag) { return tag.length > 0; });
    }

    function app(el, policies, questions) {

        function masonryDecorator(node) {
            new Masonry(node, {
                'itemSelector': '.policy-grid__list__item',
                'columnWidth': '.policy-grid__list__sizer',
                'transitionDuration': 0
            });

            return { 'teardown': function () {} };
        }

        function masonryItemDecorator(node) {
            var masonry = Masonry.data(node.parentNode);
            if (masonry) {
                masonry.addItems(node);
                masonry.layout();

                return {
                    'teardown': function () {
                        masonry.remove(node);
                        masonry.layout();
                    }
                };
            }

            return { 'teardown': function () {} };
        }

        var ractive = new Ractive({
            'el': el,
            'template': mainTemplate,
            'components': {
                'policy-grid': Ractive.extend({'template': policyGridTemplate})
            },
            'data': {
                'policies': policies,
                'policyNo': 0,
                'questions': questions,
                'questionNo': 0,
                'userAnswers': [],
                'userTags': { 'added': [], 'removed': [] }
            },
            'computed': {
                'tags': function () {
                    // Get the full list of unique tags
                    return this.get('questions').flatMap(function (question) {
                        return question.answers.flatMap(function (answer) { return answer.tags; });
                    }).filter(function (tag, index, tags) {
                        return tags.indexOf(tag) === index;
                    });
                },
                'visibleTags': function () {
                    var removedTags = this.get('userTags.removed');
                    var tags = this.get('userAnswers')
                        .flatMap(function (answer) { return answer.tags; })
                        .filter(function (tag) { return removedTags.indexOf(tag) === -1; });

                    return tags.concat(this.get('userTags.added'));
                },
                'hiddenTags': function () {
                    var visibleTags = this.get('visibleTags');
                    return this.get('tags').filter(function (tag) {
                        return visibleTags.indexOf(tag) === -1;
                    });
                },
                'currentQuestion': '${questions}[${questionNo}]',
                'userPolicies': function () {
                    var visibleTags = this.get('visibleTags');
                    return this.get('policies').filter(function (policy) {
                        return policy.tags.reduce(function (show, tag) {
                            return show || visibleTags.indexOf(tag) !== -1;
                        }, false);
                    });
                }
            },
            'decorators': {
                'masonry': masonryDecorator,
                'masonryItem': masonryItemDecorator
            }
        });

        ractive.on('question', function (evt, questionNo) {
            this.set('questionNo', questionNo);
        });

        ractive.on('answer', function (evt) {
            var questionNo = this.get('questionNo');
            this.set('userAnswers.' + questionNo, evt.context);
            this.set('questionNo', this.get('userAnswers').length);
        });

        ractive.on('add-tag', function (evt) {
            this.push('userTags.added', evt.context);
        });

        ractive.on('remove-tag', function (evt) {
            this.push('userTags.removed', evt.context);
        });

        ractive.on('policy-grid.policy', function (evt) {
            this.set('policyNo', evt.context.rowNumber);
            Masonry.data(evt.node.parentNode).layout();
        });
    }

    function init(el) {
        iframeMessenger.enableAutoResize();

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
                            'tags': parseTags(question[s + 'tags'])
                        };
                    }
                }

                return {
                    'question': question.question,
                    'theme': question.theme,
                    'answers': answers
                };
            });

            app(el, policies, questions);
        });
    }

    return {
        init: init
    };
});
