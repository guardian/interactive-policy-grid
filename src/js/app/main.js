define([
    'pegasus',
    'app'
], function (
    pegasus,
    app
) {
    var MAX_ANSWERS = 4;
    var SHEET_URL = 'http://interactive.guim.co.uk/spreadsheetdata/1FH1NEYStgczP_B4xPPMr3_DuXHBAipkn2S0zhcFH_LU.json';

    function parseList(list) {
        return list.split(',')
            .map(function (item) { return item.trim(); })
            .filter(function (item) { return item.length > 0; });
    }

    function init(el) {
        pegasus(SHEET_URL).then(function (spreadsheet) {
            var areas = spreadsheet.sheets.areas.map(function (area) { return area.area.toLowerCase(); });

            var policies = spreadsheet.sheets.policies.map(function (policy) {
                policy.area = policy.area.toLowerCase();
                policy.questions = parseList(policy.question);
                return policy;
            });

            var questions = spreadsheet.sheets.questions.map(function (question) {
                var i, s, answers = [];
                for (i = 0; i < MAX_ANSWERS; i++) {
                    s = 'answer' + (i + 1);
                    if (question[s]) {
                        answers[i] = {
                            'text': question[s],
                            'id': question[s + 'id']
                        };
                    }
                }

                return {
                    'question': question.question,
                    'answers': answers
                };
            });

            app.start(el, policies, questions, areas);
        });
    }

    return {
        'init': init
    };
});
