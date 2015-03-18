define([
    'iframe-messenger',
    'text!templates/main.html',
    'text!templates/policyGrid.html',
    'ractive',
    'pegasus'
], function(
    iframeMessenger,
    mainTemplate,
    policyGridTemplate,
    Ractive,
    pegasus
) {
    'use strict';

    var MAX_ANSWERS = 5;
    var SHEET_URL = 'http://interactive.guim.co.uk/spreadsheetdata/1FH1NEYStgczP_B4xPPMr3_DuXHBAipkn2S0zhcFH_LU.json';

    function parseTags(tagString) {
        return tagString.split(',')
            .map(function (tag) { return tag.trim(); })
            .filter(function (tag) { return tag.length > 0; });
    }

    function app(el, policies, questions) {

        var ractive = new Ractive({
            'el': el,
            'template': mainTemplate,
            'components': {
                'policy-grid': Ractive.extend({'template': policyGridTemplate})
            },
            'data': {
                'policies': policies,
                'questions': questions,
                'questionNo': 0,
                'userAnswers': [],
                'userTags': [] // TODO: user selected tags
            },
            'computed': {
                'currentQuestion': '${questions}[${questionNo}]',
                'currentTags': function () {
                    var userAnswers = this.get('userAnswers');
                    var tags = userAnswers.map(function (a) { return a.tags; }).reduce(function (a, b) {
                        return a.concat(b);
                    });

                    return tags.concat(this.get('userTags'));
                },
                'currentPolicies': function () {
                    var currentTags = this.get('currentTags');
                    return policies.filter(function (policy) {
                        return policy.tags.reduce(function (show, tag) {
                            return show || currentTags.indexOf(tag) !== -1;
                        }, false);
                    });
                }
            }
        });

        ractive.on('answer', function (evt) {
            var questionNo = this.get('questionNo');
            this.set('userAnswers.' + questionNo, questions[questionNo].answers[evt.index.answerNo]);
            this.add('questionNo');
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
